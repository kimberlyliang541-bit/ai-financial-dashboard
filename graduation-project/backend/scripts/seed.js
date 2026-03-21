#!/usr/bin/env node
/**
 * seed.js — CLI script to fetch news + sentiment + stock prices into SQLite.
 *
 * Usage:
 *   node scripts/seed.js <SYMBOL> <FROM> <TO>
 *
 * Example:
 *   node scripts/seed.js AAPL 2026-02-01 2026-03-17
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { fetchNews, fetchCandles } = require('../services/finnhubService');
const { analyzeSentiment }        = require('../services/aiService');
const db = require('../db/database');

const [,, symbol, from, to] = process.argv;

if (!symbol || !from || !to) {
  console.error('Usage: node scripts/seed.js <SYMBOL> <FROM> <TO>');
  console.error('Example: node scripts/seed.js AAPL 2026-02-01 2026-03-19');
  process.exit(1);
}

async function main() {
  const sym = symbol.toUpperCase();
  console.log(`\nSeeding ${sym} from ${from} to ${to}…\n`);

  // Step 1: fetch and insert news
  console.log('→ Fetching news from Finnhub…');
  const articles = await fetchNews(sym, from, to);
  console.log(`  Found ${articles.length} articles.`);

  const insertNews = db.prepare(`
    INSERT OR IGNORE INTO news (headline, summary, source, url, datetime, related_symbol)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  let newIds;
  try {
    newIds = articles.map(a => {
      insertNews.run(a.headline, a.summary || null, a.source || null, a.url || null, a.datetime, sym);
      const changes = db.prepare('SELECT changes() as c').get().c;
      const id      = db.prepare('SELECT last_insert_rowid() as id').get().id;
      return changes > 0 ? id : null;
    }).filter(id => id !== null);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  console.log(`  Inserted ${newIds.length} new articles.`);

  // Step 2: analyze all unscored news in range
  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(new Date(to).getTime()   / 1000);
  const unscored = db.prepare(`
    SELECT n.id, n.headline FROM news n
    LEFT JOIN sentiment_scores s ON s.news_id = n.id
    WHERE n.related_symbol = ? AND n.datetime BETWEEN ? AND ?
      AND s.id IS NULL
  `).all(sym, fromTs, toTs);

  console.log(`\n→ Running sentiment analysis on ${unscored.length} unscored articles…`);
  const insertScore = db.prepare(`
    INSERT INTO sentiment_scores (news_id, sentiment, confidence, reason)
    VALUES (?, ?, ?, ?)
  `);

  let scored = 0;
  for (const { id, headline } of unscored) {
    try {
      process.stdout.write(`  [${scored + 1}/${unscored.length}] Analyzing…\r`);
      const score = await analyzeSentiment(headline);
      insertScore.run(id, score.sentiment, score.confidence, score.reason);
      scored++;
    } catch (e) {
      console.error(`\n  ✗ Failed for news ${id}: ${e.message}`);
    }
  }
  console.log(`\n  Scored ${scored}/${unscored.length} articles.`);

  // Step 3: fetch stock prices
  console.log('\n→ Fetching stock prices…');
  let candles = [];
  try {
    candles = await fetchCandles(sym, from, to);
  } catch (e) {
    console.warn(`  Warning: ${e.message}`);
  }

  if (candles.length > 0) {
    const insertPrice = db.prepare(`
      INSERT OR IGNORE INTO stock_prices (symbol, date, open, close, high, low)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    db.exec('BEGIN');
    try {
      for (const c of candles) insertPrice.run(sym, c.date, c.open, c.close, c.high, c.low);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    console.log(`  Inserted ${candles.length} price records.`);
  } else {
    console.log('  No price data (set ALPHA_VANTAGE_API_KEY in .env for stock prices).');
  }

  console.log('\n✓ Seed complete.\n');
  db.close();
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
