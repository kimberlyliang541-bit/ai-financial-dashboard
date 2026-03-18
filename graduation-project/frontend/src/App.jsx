import { useState, useEffect } from 'react';
import SentimentChart from './components/SentimentChart';
import StockChart     from './components/StockChart';
import OverlayChart   from './components/OverlayChart';
import KeywordChart   from './components/KeywordChart';
import LiveAnalysis   from './components/LiveAnalysis';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [from,   setFrom]   = useState(daysAgo(30));
  const [to,     setTo]     = useState(todayStr());

  const [sentimentData, setSentimentData] = useState([]);
  const [priceData,     setPriceData]     = useState([]);
  const [newsData,      setNewsData]      = useState([]);
  const [loading,       setLoading]       = useState(false);

  async function fetchAll(sym, f, t) {
    setLoading(true);
    try {
      const [sent, price, news] = await Promise.all([
        fetch(`${API}/api/sentiment/trend?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
        fetch(`${API}/api/stocks/price?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
        fetch(`${API}/api/news?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
      ]);
      setSentimentData(Array.isArray(sent)  ? sent  : []);
      setPriceData    (Array.isArray(price) ? price : []);
      setNewsData     (Array.isArray(news)  ? news  : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(symbol, from, to); }, []);

  function handleApply() { fetchAll(symbol, from, to); }

  const headlines = newsData.map(n => n.headline).filter(Boolean);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>AI Financial News Sentiment Dashboard</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
        <label>
          Symbol&nbsp;
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db', width: 90, textTransform: 'uppercase' }}
          />
        </label>
        <label>
          From&nbsp;
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db' }} />
        </label>
        <label>
          To&nbsp;
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db' }} />
        </label>
        <button onClick={handleApply} disabled={loading}
          style={{ padding: '8px 20px', borderRadius: 4, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div><SentimentChart data={sentimentData} /></div>
        <div><StockChart data={priceData} symbol={symbol} /></div>
        <div><OverlayChart sentimentData={sentimentData} priceData={priceData} symbol={symbol} /></div>
        <div><KeywordChart headlines={headlines} /></div>
      </div>

      {/* News list */}
      <h2 style={{ marginTop: 40 }}>News ({newsData.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={th}>Date</th>
            <th style={th}>Headline</th>
            <th style={th}>Source</th>
            <th style={th}>Sentiment</th>
            <th style={th}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {newsData.map(n => (
            <tr key={n.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={td}>{n.datetime ? new Date(n.datetime * 1000).toLocaleDateString() : '—'}</td>
              <td style={td}><a href={n.url} target="_blank" rel="noreferrer">{n.headline}</a></td>
              <td style={td}>{n.source}</td>
              <td style={{ ...td, color: sentimentColor(n.sentiment), fontWeight: 600, textTransform: 'capitalize' }}>{n.sentiment || '—'}</td>
              <td style={td}>{n.confidence != null ? `${Math.round(n.confidence * 100)}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Live Analysis */}
      <h2 style={{ marginTop: 48 }}>Real-time Analysis</h2>
      <LiveAnalysis />
    </div>
  );
}

const th = { padding: '8px 12px', textAlign: 'left', fontWeight: 600 };
const td = { padding: '8px 12px' };

function sentimentColor(s) {
  if (s === 'positive') return '#10b981';
  if (s === 'negative') return '#ef4444';
  return '#6b7280';
}
