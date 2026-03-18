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
 * Fetch daily OHLC candles from Finnhub.
 * @param {string} symbol
 * @param {string} from  'YYYY-MM-DD'
 * @param {string} to    'YYYY-MM-DD'
 * @returns {Promise<Array<{date, open, close, high, low}>>}
 */
async function fetchCandles(symbol, from, to) {
  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(new Date(to).getTime()   / 1000);
  const url = `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${fromTs}&to=${toTs}&token=${process.env.FINNHUB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub candle error: ${res.status}`);
  const data = await res.json();

  if (data.s !== 'ok') return [];

  return data.t.map((ts, i) => ({
    date:  new Date(ts * 1000).toISOString().slice(0, 10),
    open:  data.o[i],
    close: data.c[i],
    high:  data.h[i],
    low:   data.l[i],
  }));
}

module.exports = { fetchNews, fetchCandles };
