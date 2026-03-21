const fetch = require('node-fetch');

const BASE_URL = 'https://finnhub.io/api/v1';

async function fetchNews(symbol, from, to) {
  const url = `${BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub news error: ${res.status}`);
  return res.json();
}

// ─── 股价数据：三级 Fallback ───────────────────────────

/**
 * 第 1 级：Alpha Vantage（需要免费 Key）
 * 返回最近 100 个交易日的日线数据
 */
async function fetchFromAlphaVantage(symbol) {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return [];

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${key}`;
  const res = await fetch(url, { timeout: 10000 });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);

  const json = await res.json();

  if (json['Note'] || json['Information'] || json['Error Message']) {
    throw new Error(json['Note'] || json['Information'] || json['Error Message']);
  }

  const timeSeries = json['Time Series (Daily)'];
  if (!timeSeries) return [];

  return Object.entries(timeSeries).map(([date, values]) => ({
    date,
    open:  parseFloat(values['1. open']),
    high:  parseFloat(values['2. high']),
    low:   parseFloat(values['3. low']),
    close: parseFloat(values['4. close']),
  })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 第 2 级：Stooq CSV（免费，无需 Key）
 * 美股 symbol 需要加 .US 后缀
 */
async function fetchFromStooq(symbol, from, to) {
  const d1 = from.replace(/-/g, '');
  const d2 = to.replace(/-/g, '');
  const url = `https://stooq.com/q/d/l/?s=${symbol}.US&d1=${d1}&d2=${d2}&i=d`;
  const res = await fetch(url, { timeout: 10000 });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);

  const text = await res.text();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // 跳过表头 "Date,Open,High,Low,Close,Volume"
  return lines.slice(1).map(line => {
    const [date, open, high, low, close] = line.split(',');
    if (!date || !close || close === 'N/D') return null;
    return {
      date,
      open:  parseFloat(open),
      high:  parseFloat(high),
      low:   parseFloat(low),
      close: parseFloat(close),
    };
  }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 第 3 级：本地 Mock 数据（答辩兜底）
 */
function loadMockData(symbol, from, to) {
  try {
    const path = require('path');
    const fs = require('fs');
    const file = path.join(__dirname, '..', 'data', `mock-${symbol}.json`);
    if (!fs.existsSync(file)) return [];
    const all = JSON.parse(fs.readFileSync(file, 'utf8'));
    return all.filter(d => d.date >= from && d.date <= to);
  } catch {
    return [];
  }
}

/**
 * 按日期范围过滤
 */
function filterByDateRange(data, from, to) {
  return data.filter(d => d.date >= from && d.date <= to);
}

/**
 * 主函数：依次尝试三个数据源
 */
async function fetchCandles(symbol, from, to) {
  // 第 1 级：Alpha Vantage
  try {
    const data = await fetchFromAlphaVantage(symbol);
    if (data.length > 0) {
      const filtered = filterByDateRange(data, from, to);
      if (filtered.length > 0) {
        console.log(`[Stock] Alpha Vantage OK: ${filtered.length} records`);
        return filtered;
      }
    }
  } catch (e) {
    console.warn('[Stock] Alpha Vantage failed:', e.message);
  }

  // 第 2 级：Stooq
  try {
    const data = await fetchFromStooq(symbol, from, to);
    if (data.length > 0) {
      console.log(`[Stock] Stooq fallback OK: ${data.length} records`);
      return data;
    }
  } catch (e) {
    console.warn('[Stock] Stooq failed:', e.message);
  }

  // 第 3 级：本地 Mock
  const mock = loadMockData(symbol, from, to);
  if (mock.length > 0) {
    console.log(`[Stock] Mock data loaded: ${mock.length} records`);
    return mock;
  }

  console.warn('[Stock] All sources failed, returning empty');
  return [];
}

module.exports = { fetchNews, fetchCandles };
