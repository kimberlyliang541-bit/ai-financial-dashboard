const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// GET /api/stocks/price?symbol=AAPL&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/price', (req, res) => {
  const { symbol, from, to } = req.query;
  if (!symbol || !from || !to) {
    return res.status(400).json({ error: 'symbol, from, to are required' });
  }

  const rows = db.prepare(`
    SELECT date, open, close, high, low
    FROM stock_prices
    WHERE symbol = ? AND date BETWEEN ? AND ?
    ORDER BY date ASC
  `).all(symbol.toUpperCase(), from, to);

  res.json(rows);
});

module.exports = router;
