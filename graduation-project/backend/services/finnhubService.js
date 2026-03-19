const fetch = require('node-fetch');

const BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Fetch company news from Finnhub.
 * @param {string} symbol  Stock ticker, e.g. 'AAPL'
 * @param {string} from    Start date 'YYYY-MM-DD'
 * @param {string} to      End date   'YYYY-MM-DD'
 * @returns {Promise<Array>}
 */
async function fetchNews(symbol, from, to) {
  const url = `${BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub news error: ${res.status}`);
  return res.json();
}

/**
 * Fetch daily OHLC candles from Yahoo Finance (no API key required).
 * @param {string} symbol
 * @param {string} from  'YYYY-MM-DD'
 * @param {string} to    'YYYY-MM-DD'
 * @returns {Promise<Array<{date, open, close, high, low}>>}
 */
async function fetchCandles(symbol, from, to) {
  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(new Date(to).getTime()   / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${fromTs}&period2=${toTs}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`);
  const data = await res.json();

  const result = data?.chart?.result?.[0];
  if (!result) return [];

  const timestamps = result.timestamp;
  const { open, close, high, low } = result.indicators.quote[0];

  return timestamps.map((ts, i) => ({
    date:  new Date(ts * 1000).toISOString().slice(0, 10),
    open:  open[i],
    close: close[i],
    high:  high[i],
    low:   low[i],
  })).filter(c => c.close != null);
}

module.exports = { fetchNews, fetchCandles };
