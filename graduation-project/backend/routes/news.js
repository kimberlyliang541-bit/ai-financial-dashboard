const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { fetchNews, fetchCandles } = require('../services/finnhubService');
const { analyzeSentiment }        = require('../services/aiService');

// GET /api/news?symbol=AAPL&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', (req, res) => {
  const { symbol, from, to } = req.query;
  if (!symbol || !from || !to) {
    return res.status(400).json({ error: 'symbol, from, to are required' });
  }

  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(new Date(to).getTime()   / 1000);

  const rows = db.prepare(`
    SELECT n.id, n.headline, n.source, n.url, n.datetime, n.related_symbol,
           s.sentiment, s.confidence, s.reason
    FROM news n
    LEFT JOIN sentiment_scores s ON s.news_id = n.id
    WHERE n.related_symbol = ? AND n.datetime BETWEEN ? AND ?
    ORDER BY n.datetime DESC
  `).all(symbol.toUpperCase(), fromTs, toTs);

  res.json(rows);
});

// POST /api/news/fetch  { symbol, from, to }
router.post('/fetch', async (req, res) => {
  const { symbol, from, to } = req.body;
  if (!symbol || !from || !to) {
    return res.status(400).json({ error: 'symbol, from, to are required' });
  }

  try {
    const articles = await fetchNews(symbol.toUpperCase(), from, to);

    const insertNews = db.prepare(`
      INSERT OR IGNORE INTO news (headline, summary, source, url, datetime, related_symbol)
      VALUES (@headline, @summary, @source, @url, @datetime, @related_symbol)
    `);
    const insertScore = db.prepare(`
      INSERT INTO sentiment_scores (news_id, sentiment, confidence, reason)
      VALUES (@news_id, @sentiment, @confidence, @reason)
    `);

    let inserted = 0;

    const runBatch = db.transaction(async () => {
      for (const article of articles) {
        const info = insertNews.run({
          headline:       article.headline,
          summary:        article.summary || null,
          source:         article.source  || null,
          url:            article.url     || null,
          datetime:       article.datetime,
          related_symbol: symbol.toUpperCase(),
        });

        if (info.changes === 0) continue; // already exists

        const newsId = info.lastInsertRowid;
        try {
          const score = await analyzeSentiment(article.headline);
          insertScore.run({ news_id: newsId, ...score });
        } catch (e) {
          console.error(`Sentiment analysis failed for news ${newsId}:`, e.message);
        }
        inserted++;
      }
    });

    await runBatch();

    // Also fetch and store stock prices for the same range
    const candles = await fetchCandles(symbol.toUpperCase(), from, to);
    const insertPrice = db.prepare(`
      INSERT OR IGNORE INTO stock_prices (symbol, date, open, close, high, low)
      VALUES (@symbol, @date, @open, @close, @high, @low)
    `);
    const insertPrices = db.transaction(() => {
      for (const c of candles) insertPrice.run({ symbol: symbol.toUpperCase(), ...c });
    });
    insertPrices();

    res.json({ inserted, pricesInserted: candles.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
