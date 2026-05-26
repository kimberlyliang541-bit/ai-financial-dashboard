const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { analyzeSentiment, generateText, getHealthReport } = require('../services/aiService');

// GET /api/sentiment/health — AI platform health status (for debugging)
router.get('/health', (req, res) => {
  res.json({
    platforms: getHealthReport(),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/sentiment/trend?symbol=AAPL&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/trend', (req, res) => {
  const { symbol, from, to } = req.query;
  if (!symbol || !from || !to) {
    return res.status(400).json({ error: 'symbol, from, to are required' });
  }

  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(new Date(to).getTime()   / 1000);

  // Map sentiment label to numeric score: positive=1, neutral=0, negative=-1
  const rows = db.prepare(`
    SELECT
      date(n.datetime, 'unixepoch') AS date,
      AVG(
        CASE s.sentiment
          WHEN 'positive' THEN 1.0
          WHEN 'negative' THEN -1.0
          ELSE 0.0
        END
      ) AS avgScore,
      COUNT(*) AS count
    FROM news n
    JOIN sentiment_scores s ON s.news_id = n.id
    WHERE n.related_symbol = ? AND n.datetime BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date ASC
  `).all(symbol.toUpperCase(), fromTs, toTs);

  res.json(rows);
});

// GET /api/sentiment/distribution?symbol=AAPL&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/distribution', (req, res) => {
  const { symbol, from, to } = req.query;
  if (!symbol || !from || !to) {
    return res.status(400).json({ error: 'symbol, from, to are required' });
  }

  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(new Date(to).getTime()   / 1000);

  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN s.sentiment = 'positive' THEN 1 ELSE 0 END) AS positive,
      SUM(CASE WHEN s.sentiment = 'negative' THEN 1 ELSE 0 END) AS negative,
      SUM(CASE WHEN s.sentiment = 'neutral'  THEN 1 ELSE 0 END) AS neutral
    FROM news n
    JOIN sentiment_scores s ON s.news_id = n.id
    WHERE n.related_symbol = ? AND n.datetime BETWEEN ? AND ?
  `).get(symbol.toUpperCase(), fromTs, toTs);

  res.json(row || { positive: 0, negative: 0, neutral: 0 });
});

// POST /api/sentiment/analyze  { text }
router.post('/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const result = await analyzeSentiment(text.trim());
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sentiment/report
router.post('/report', async (req, res) => {
  const { symbol, from, to, sentimentSummary, priceSummary, distribution, pearsonR } = req.body;

  if (!symbol || !from || !to) {
    return res.status(400).json({ error: 'symbol, from, to are required' });
  }

  const prompt = `You are a financial analyst. Write a brief analysis report (3 short paragraphs, each 2-3 sentences) based on:

Symbol: ${symbol} | Period: ${from} to ${to}

Sentiment data (daily avg score, -1 to +1):
${sentimentSummary || 'No sentiment data available'}

Stock price data (daily close, USD):
${priceSummary || 'No price data available'}

Distribution: ${distribution?.positive ?? 0} positive, ${distribution?.negative ?? 0} negative, ${distribution?.neutral ?? 0} neutral articles
Pearson correlation coefficient: ${pearsonR ?? 'N/A'}

Paragraph 1 - SENTIMENT TREND: Describe the overall sentiment direction. Any notable shifts?
Paragraph 2 - CORRELATION FINDING: Interpret the Pearson r value. Do sentiment and price move together?
Paragraph 3 - OUTLOOK: Based on recent sentiment momentum, what's the short-term mood?

Be specific with numbers. Keep it concise.`;

  try {
    const report = await generateText(prompt);
    res.json({ report });
  } catch (e) {
    console.error('[report]', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
