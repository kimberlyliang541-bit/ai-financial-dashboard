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
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Step 1: insert all news rows in a single sync transaction
    db.exec('BEGIN');
    let newIds;
    try {
      newIds = articles.map(article => {
        insertNews.run(
          article.headline,
          article.summary || null,
          article.source  || null,
          article.url     || null,
          article.datetime,
          symbol.toUpperCase(),
        );
        const changes = db.prepare('SELECT changes() as c').get().c;
        const id = db.prepare('SELECT last_insert_rowid() as id').get().id;
        return changes > 0 ? id : null;
      }).filter(id => id !== null);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    // Step 2: async AI analysis — newly inserted + existing unscored in this range
    const fromTs = Math.floor(new Date(from).getTime() / 1000);
    const toTs   = Math.floor(new Date(to).getTime()   / 1000);
    const unscored = db.prepare(`
      SELECT n.id, n.headline FROM news n
      LEFT JOIN sentiment_scores s ON s.news_id = n.id
      WHERE n.related_symbol = ? AND n.datetime BETWEEN ? AND ?
        AND s.id IS NULL
    `).all(symbol.toUpperCase(), fromTs, toTs);

    const insertScore = db.prepare(`
      INSERT INTO sentiment_scores (news_id, sentiment, confidence, reason)
      VALUES (?, ?, ?, ?)
    `);

    let scored = 0;
    for (const { id: newsId, headline } of unscored) {
      try {
        const score = await analyzeSentiment(headline);
        insertScore.run(newsId, score.sentiment, score.confidence, score.reason);
        scored++;
      } catch (e) {
        console.error(`Sentiment analysis failed for news ${newsId}:`, e.message);
      }
    }

    // Step 3: fetch and store stock prices for the same range
    let candles = [];
    try {
      candles = await fetchCandles(symbol.toUpperCase(), from, to);
    } catch (e) {
      console.warn('fetchCandles failed (stock prices skipped):', e.message);
    }
    const insertPrice = db.prepare(`
      INSERT OR IGNORE INTO stock_prices (symbol, date, open, close, high, low)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    db.exec('BEGIN');
    try {
      for (const c of candles) insertPrice.run(symbol.toUpperCase(), c.date, c.open, c.close, c.high, c.low);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({ inserted: newIds.length, scored, pricesInserted: candles.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
