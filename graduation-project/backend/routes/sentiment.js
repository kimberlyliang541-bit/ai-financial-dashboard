const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { analyzeSentiment } = require('../services/aiService');

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

module.exports = router;
