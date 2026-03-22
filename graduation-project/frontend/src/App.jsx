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
    <>
      {/* ── Header ── */}
      <header className="app-header">
        <h1>AI Financial News Sentiment Dashboard</h1>
        <p>Financial news · AI sentiment analysis · Stock price correlation</p>
      </header>

      <main className="app-main">

        {/* Summary Cards */}
        <SummaryCards sentimentData={sentimentData} newsData={newsData} />

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <label>
            Symbol
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              style={{ width: 88, textTransform: 'uppercase' }}
            />
          </label>
          <label>
            From
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </label>
          <button className="btn btn-primary" onClick={handleApply} disabled={loading || fetching}>
            {loading ? 'Loading…' : 'Apply'}
          </button>
          <button className="btn btn-success" onClick={handleFetch} disabled={loading || fetching}>
            {fetching ? 'Fetching…' : '⬇ Fetch Data'}
          </button>
        </div>

        {/* Loading bar */}
        {(loading || fetching) && <div className="loading-bar" />}

        {/* Alerts */}
        {fetchMsg && <div className="alert alert-success">{fetchMsg}</div>}
        {error    && <div className="alert alert-error">Error: {error}</div>}

        {/* Empty state */}
        {isEmpty && !loading && !fetching && (
          <div className="empty-state">
            <h2>No data yet</h2>
            <p>
              Set a stock symbol and date range, then click <strong>Fetch Data</strong>
              {' '}to pull news and run AI sentiment analysis.
            </p>
            <button
              className="btn btn-success"
              style={{ fontSize: 15, padding: '10px 28px' }}
              onClick={() => {
                setSymbol('AAPL');
                setFrom(daysAgo(30));
                setTo(todayStr());
                setTimeout(handleFetch, 100);
              }}
            >
              Quick Start: AAPL, last 30 days
            </button>
          </div>
        )}

        {/* ── Row 1: Sentiment + Stock ── */}
        <div className="chart-row-2">
          <div className="card"><SentimentChart data={sentimentData} /></div>
          <div className="card"><StockChart data={priceData} symbol={symbol} /></div>
        </div>

        {/* ── Row 2: Overlay (full width) ── */}
        <div className="chart-row-1">
          <div className="card">
            <OverlayChart sentimentData={sentimentData} priceData={priceData} symbol={symbol} />
          </div>
        </div>

        {/* ── Row 3: Distribution + Keywords ── */}
        <div className="chart-row-2">
          <div className="card"><SentimentDistribution data={distributionData} /></div>
          <div className="card"><KeywordChart headlines={headlines} /></div>
        </div>

        {/* ── News Table ── */}
        <h2 className="section-title">News ({newsData.length})</h2>
        <div className="card news-table-wrap" style={{ marginBottom: 32 }}>
          <table className="news-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Headline</th>
                <th>Source</th>
                <th>Sentiment</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {newsData.slice(0, 50).map(n => (
                <tr key={n.id}>
                  <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                    {n.datetime ? new Date(n.datetime * 1000).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <a className="news-link" href={n.url} target="_blank" rel="noreferrer">
                      {n.headline}
                    </a>
                  </td>
                  <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{n.source}</td>
                  <td>
                    <span className={`pill pill-${n.sentiment || 'neutral'}`}>
                      {n.sentiment || '—'}
                    </span>
                  </td>
                  <td style={{ color: '#64748b' }}>
                    {n.confidence != null ? `${Math.round(n.confidence * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {newsData.length > 50 && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: '12px 0 4px' }}>
              Showing 50 of {newsData.length} articles
            </p>
          )}
        </div>

        {/* ── Live Analysis ── */}
        <h2 className="section-title">Real-time Analysis</h2>
        <div className="card">
          <LiveAnalysis />
        </div>

      </main>
    </>
  );
}
