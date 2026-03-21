import { useState, useEffect } from 'react';
import SentimentChart         from './components/SentimentChart';
import StockChart             from './components/StockChart';
import OverlayChart           from './components/OverlayChart';
import KeywordChart           from './components/KeywordChart';
import LiveAnalysis           from './components/LiveAnalysis';
import SummaryCards           from './components/SummaryCards';
import SentimentDistribution  from './components/SentimentDistribution';

const API = import.meta.env.VITE_API_URL || '';

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

  const [sentimentData,    setSentimentData]    = useState([]);
  const [priceData,        setPriceData]        = useState([]);
  const [newsData,         setNewsData]         = useState([]);
  const [distributionData, setDistributionData] = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState(null);
  const [fetching,         setFetching]         = useState(false);
  const [fetchMsg,         setFetchMsg]         = useState(null);

  async function fetchAll(sym, f, t) {
    setLoading(true);
    setError(null);
    const [sentR, priceR, newsR, distR] = await Promise.allSettled([
      fetch(`${API}/api/sentiment/trend?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
      fetch(`${API}/api/stocks/price?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
      fetch(`${API}/api/news?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
      fetch(`${API}/api/sentiment/distribution?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
    ]);
    setSentimentData(sentR.status === 'fulfilled' && Array.isArray(sentR.value) ? sentR.value : []);
    setPriceData(priceR.status === 'fulfilled' && Array.isArray(priceR.value) ? priceR.value : []);
    setNewsData(newsR.status === 'fulfilled' && Array.isArray(newsR.value) ? newsR.value : []);
    setDistributionData(distR.status === 'fulfilled' ? distR.value : null);
    setLoading(false);
  }

  useEffect(() => { fetchAll(symbol, from, to); }, []);

  function handleApply() { fetchAll(symbol, from, to); }

  async function handleFetch() {
    setFetching(true);
    setFetchMsg(null);
    setError(null);
    try {
      const res = await fetch(`${API}/api/news/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, from, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setFetchMsg(`Done: ${data.inserted} new articles, ${data.scored} analyzed, ${data.pricesInserted} prices.`);
      await fetchAll(symbol, from, to);
    } catch (e) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  }

  const headlines = newsData.map(n => n.headline).filter(Boolean);
  const isEmpty = sentimentData.length === 0 && priceData.length === 0 && newsData.length === 0;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 64px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 4, fontSize: 24 }}>AI Financial News Sentiment Dashboard</h1>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        Fetches financial news · Analyzes sentiment with AI · Discovers correlation with stock prices
      </p>

      {/* Summary Cards */}
      <SummaryCards sentimentData={sentimentData} newsData={newsData} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', margin: '24px 0' }}>
        <label>
          Symbol&nbsp;
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', width: 90, textTransform: 'uppercase' }} />
        </label>
        <label>
          From&nbsp;
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db' }} />
        </label>
        <label>
          To&nbsp;
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db' }} />
        </label>
        <button onClick={handleApply} disabled={loading || fetching}
          style={{ padding: '8px 20px', borderRadius: 6, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Loading…' : 'Apply'}
        </button>
        <button onClick={handleFetch} disabled={loading || fetching}
          style={{ padding: '8px 20px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          {fetching ? 'Fetching…' : 'Fetch Data'}
        </button>
      </div>

      {fetchMsg && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
          {fetchMsg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
          Error: {error}
        </div>
      )}

      {/* 空状态引导 */}
      {isEmpty && !loading && !fetching && (
        <div style={{
          textAlign: 'center', padding: '48px 24px', border: '2px dashed #d1d5db',
          borderRadius: 12, marginBottom: 32, background: '#fafafa'
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#374151' }}>No data yet</h2>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>
            Choose a stock symbol and date range, then click <strong>Fetch Data</strong> to pull news and run AI sentiment analysis.
          </p>
          <button onClick={() => { setSymbol('AAPL'); setFrom(daysAgo(30)); setTo(todayStr()); setTimeout(handleFetch, 100); }}
            style={{ padding: '10px 28px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
            Quick Start: AAPL, last 30 days
          </button>
        </div>
      )}

      {/* 第一行：SentimentChart + StockChart 并排 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={cardStyle}><SentimentChart data={sentimentData} /></div>
        <div style={cardStyle}><StockChart data={priceData} symbol={symbol} /></div>
      </div>

      {/* 第二行：OverlayChart 独占满宽（核心亮点） */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <OverlayChart sentimentData={sentimentData} priceData={priceData} symbol={symbol} />
      </div>

      {/* 第三行：Distribution + Keywords 并排 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={cardStyle}><SentimentDistribution data={distributionData} /></div>
        <div style={cardStyle}><KeywordChart headlines={headlines} /></div>
      </div>

      {/* News Table */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>News ({newsData.length})</h2>
      <div style={{ ...cardStyle, overflowX: 'auto', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={th}>Date</th>
              <th style={th}>Headline</th>
              <th style={th}>Source</th>
              <th style={th}>Sentiment</th>
              <th style={th}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {newsData.slice(0, 50).map(n => (
              <tr key={n.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{n.datetime ? new Date(n.datetime * 1000).toLocaleDateString() : '—'}</td>
                <td style={td}><a href={n.url} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>{n.headline}</a></td>
                <td style={{ ...td, color: '#6b7280' }}>{n.source}</td>
                <td style={td}><span style={pillStyle(n.sentiment)}>{n.sentiment || '—'}</span></td>
                <td style={td}>{n.confidence != null ? `${Math.round(n.confidence * 100)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {newsData.length > 50 && <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, margin: '12px 0 4px' }}>Showing 50 of {newsData.length} articles</p>}
      </div>

      {/* Live Analysis */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Real-time Analysis</h2>
      <LiveAnalysis />
    </div>
  );
}

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '16px 20px',
};

const th = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' };
const td = { padding: '10px 12px' };

function pillStyle(sentiment) {
  const colors = {
    positive: { bg: '#d1fae5', color: '#065f46' },
    negative: { bg: '#fee2e2', color: '#b91c1c' },
    neutral:  { bg: '#f3f4f6', color: '#374151' },
  };
  const c = colors[sentiment] || colors.neutral;
  return {
    display: 'inline-block', padding: '2px 10px', borderRadius: 99,
    background: c.bg, color: c.color, fontWeight: 500, fontSize: 12, textTransform: 'capitalize',
  };
}
