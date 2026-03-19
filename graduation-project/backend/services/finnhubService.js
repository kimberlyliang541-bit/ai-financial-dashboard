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
 * Fetch daily OHLC candles from Alpha Vantage (free tier).
 * Requires ALPHA_VANTAGE_API_KEY in .env
 * @param {string} symbol
 * @param {string} from  'YYYY-MM-DD'
 * @param {string} to    'YYYY-MM-DD'
 * @returns {Promise<Array<{date, open, close, high, low}>>}
 */
async function fetchCandles(symbol, from, to) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.warn('ALPHA_VANTAGE_API_KEY not set — skipping stock price fetch');
    return [];
  }

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage error: ${res.status}`);
  const data = await res.json();

  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) return [];

  return Object.entries(timeSeries)
    .filter(([date]) => date >= from && date <= to)
    .map(([date, ohlc]) => ({
      date,
      open:  parseFloat(ohlc['1. open']),
      close: parseFloat(ohlc['4. close']),
      high:  parseFloat(ohlc['2. high']),
      low:   parseFloat(ohlc['3. low']),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { fetchNews, fetchCandles };
