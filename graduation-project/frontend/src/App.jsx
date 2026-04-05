import { useState, useEffect } from 'react';
import SentimentChart        from './components/SentimentChart';
import StockChart            from './components/StockChart';
import OverlayChart          from './components/OverlayChart';
import KeywordChart          from './components/KeywordChart';
import LiveAnalysis          from './components/LiveAnalysis';
import SentimentDistribution from './components/SentimentDistribution';
import { C } from './theme.js';
import { SentimentFace, Pill, Badge, ChartCard } from './components/ui';

const API = import.meta.env.VITE_API_URL || '';

// ─── Local-only primitives ────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, face, icon }) {
  return (
    <div style={{ background: C.surface, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
      {/* subtle top glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color || C.accent}44, transparent)` }}/>
      <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {face && <SentimentFace type={face} size={24}/>}
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
        <div style={{ fontSize: 28, fontWeight: 700, color: color || C.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      </div>
      {sub && <div style={{ fontSize: 11, color: C.textMid, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function NavItem({ label, active, icon, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
      fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all .18s',
      background: active ? C.accentBg : 'transparent',
      color: active ? C.accent : C.textMid,
    }}>
      <span style={{ display: 'flex', opacity: active ? 1 : 0.6 }}>{icon}</span>
      {label}
      {active && (
        <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: 99, background: C.accent, boxShadow: `0 0 6px ${C.accent}` }}/>
      )}
    </div>
  );
}

// ─── Computations ─────────────────────────────────────────────────────────────
function computeAvg(d) {
  if (!d?.length) return null;
  return d.reduce((s, x) => s + x.avgScore, 0) / d.length;
}
function computeTrend(d) {
  if (!d?.length || d.length < 4) return 'stable';
  const mid = Math.floor(d.length / 2);
  const a = d.slice(0, mid).reduce((s, x) => s + x.avgScore, 0) / mid;
  const b = d.slice(mid).reduce((s, x) => s + x.avgScore, 0) / (d.length - mid);
  if (b - a > 0.1) return 'rising';
  if (a - b > 0.1) return 'declining';
  return 'stable';
}
function normalize(arr) {
  const valid = arr.filter(v => v !== null);
  if (!valid.length) return arr;
  const min = Math.min(...valid), max = Math.max(...valid);
  if (max === min) return arr.map(v => v === null ? null : 0);
  return arr.map(v => v === null ? null : ((v - min) / (max - min)) * 2 - 1);
}
function computePearson(sd, pd) {
  if (!sd?.length || !pd?.length) return null;
  const sm = Object.fromEntries(sd.map(d => [d.date, d.avgScore]));
  const pm = Object.fromEntries(pd.map(d => [d.date, d.close]));
  const dates = [...new Set([...Object.keys(sm), ...Object.keys(pm)])].sort();
  const xs = dates.map(d => sm[d] ?? null);
  const ys = normalize(dates.map(d => pm[d] ?? null));
  const pairs = dates.map((_, i) => [xs[i], ys[i]]).filter(([a, b]) => a !== null && b !== null);
  const n = pairs.length;
  if (n < 3) return null;
  const [sx, sy, sxy, sx2, sy2] = pairs.reduce(
    ([a, b, c, d, e], [x, y]) => [a+x, b+y, c+x*y, d+x*x, e+y*y], [0,0,0,0,0]
  );
  const num = n*sxy - sx*sy;
  const den = Math.sqrt((n*sx2 - sx*sx) * (n*sy2 - sy*sy));
  return den === 0 ? 0 : num/den;
}
function dateRange(sd, nd) {
  const dates = [
    ...(sd||[]).map(d => d.date),
    ...(nd||[]).map(n => n.datetime ? new Date(n.datetime*1000).toISOString().slice(0,10) : null).filter(Boolean),
  ].sort();
  if (!dates.length) return '—';
  if (dates[0] === dates[dates.length-1]) return dates[0];
  return `${dates[0]} – ${dates[dates.length-1]}`;
}

// ─── Pages ────────────────────────────────────────────────────────────────────
function DashboardPage({ sentimentData, priceData, newsData, distributionData, symbol }) {
  const avg   = computeAvg(sentimentData);
  const trend = computeTrend(sentimentData);
  const r     = computePearson(sentimentData, priceData);

  const avgFace  = avg === null ? 'neutral' : avg >= 0.1 ? 'positive' : avg <= -0.1 ? 'negative' : 'neutral';
  const avgColor = avg === null ? C.text : avg >= 0.1 ? C.pos : avg <= -0.1 ? C.red : C.textMid;
  const trendLabel = { rising: 'Rising', declining: 'Declining', stable: 'Stable' }[trend];
  const trendFace  = { rising: 'positive', declining: 'negative', stable: 'neutral' }[trend];
  const trendColor = { rising: C.pos, declining: C.red, stable: C.textMid }[trend];
  const rAbs = r !== null ? Math.abs(r) : null;
  const rColor = r !== null ? (rAbs > 0.4 ? (r > 0 ? C.pos : C.red) : C.textMid) : C.textDim;
  const headlines = (newsData||[]).map(n => n.headline).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <MetricCard label="Avg sentiment" value={avg === null ? '—' : (avg >= 0 ? '+' : '') + avg.toFixed(2)} sub={`across ${newsData.length} articles`} color={avgColor} face={avg !== null ? avgFace : undefined}/>
        <MetricCard label="Articles loaded" value={newsData.length} sub={`${symbol} · in range`} icon="📰"/>
        <MetricCard label="Correlation" value={r !== null ? `r ${r >= 0 ? '+' : ''}${r.toFixed(2)}` : '—'} sub={rAbs !== null ? (rAbs > 0.7 ? 'Strong' : rAbs > 0.4 ? 'Moderate' : 'Weak') + (r >= 0 ? ' positive' : ' negative') : 'Load both datasets'} color={rColor}/>
        <MetricCard label="Sentiment trend" value={trendLabel} sub="vs. prior half period" color={trendColor} face={trendFace}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <ChartCard title="Sentiment trend" badge={<Badge color={C.accent}>Daily avg</Badge>}>
          <SentimentChart data={sentimentData}/>
        </ChartCard>
        <ChartCard title="Stock price" badge={<><Badge color={C.sky}>Close</Badge><Badge color={C.amber}>MA5</Badge><Badge color={C.textMid}>MA20</Badge></>}>
          <StockChart data={priceData} symbol={symbol}/>
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <ChartCard title="Sentiment distribution">
          <SentimentDistribution data={distributionData}/>
        </ChartCard>
        <ChartCard title="Top keywords">
          <KeywordChart headlines={headlines}/>
        </ChartCard>
      </div>
    </div>
  );
}

function AnalysisPage({ sentimentData, priceData, symbol }) {
  const r = computePearson(sentimentData, priceData);
  const abs = r !== null ? Math.abs(r) : null;
  const strength  = abs === null ? '' : abs > 0.7 ? 'Strong' : abs > 0.4 ? 'Moderate' : 'Weak';
  const direction = r !== null ? (r >= 0 ? 'positive' : 'negative') : '';
  const rColor    = r !== null ? (abs > 0.4 ? (r > 0 ? C.pos : C.red) : C.textMid) : C.textDim;
  const rFace     = r !== null ? (r >= 0.1 ? 'positive' : r <= -0.1 ? 'negative' : 'neutral') : 'neutral';
  const pct       = r !== null ? Math.round((r + 1) / 2 * 100) : 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {r !== null && (
        <div style={{ background: C.surface, borderRadius: 12, padding: 22, border: `1px solid ${C.border}`, display: 'flex', gap: 28, alignItems: 'center' }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Pearson r</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: rColor, lineHeight: 1, letterSpacing: '-0.04em' }}>{r.toFixed(2)}</div>
              <SentimentFace type={rFace} size={36}/>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>{strength} {direction} correlation</div>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>
              {symbol} shows a {strength.toLowerCase()} {direction} correlation between news sentiment and stock price.{' '}
              {direction === 'positive' ? 'Positive news tends to coincide with price increases.' : direction === 'negative' ? 'Negative sentiment tends to coincide with price decreases.' : ''}
            </div>
            <div style={{ marginTop: 14, position: 'relative', height: 4, borderRadius: 2 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 2, background: `linear-gradient(90deg, ${C.red} 0%, ${C.textDim} 50%, ${C.pos} 100%)` }}/>
              <div style={{ position: 'absolute', left: `${pct}%`, top: -5, width: 14, height: 14, borderRadius: 99, background: rColor, border: `3px solid ${C.bg}`, transform: 'translateX(-50%)', boxShadow: `0 0 8px ${rColor}88` }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, color: C.textDim }}>
              <span>−1.0</span><span>0</span><span>+1.0</span>
            </div>
          </div>
        </div>
      )}
      <ChartCard title={`Sentiment vs. Stock Price — ${symbol}`}>
        <OverlayChart sentimentData={sentimentData} priceData={priceData} symbol={symbol}/>
      </ChartCard>
    </div>
  );
}

function LiveTestPage() {
  return (
    <div>
      <LiveAnalysis/>
    </div>
  );
}

function NewsPage({ newsData }) {
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Recent news</span>
        <span style={{ fontSize: 11, color: C.textDim }}>{newsData.length} articles</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Date','Headline','Source','Sentiment','Conf.'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {newsData.slice(0,100).map((n,i) => (
              <tr key={n.id??i} style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHi}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '10px 16px', color: C.textDim, whiteSpace: 'nowrap' }}>
                  {n.datetime ? new Date(n.datetime*1000).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '10px 16px', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.url
                    ? <a href={n.url} target="_blank" rel="noreferrer" style={{ color: C.accent, textDecoration: 'none', fontWeight: 500 }}>{n.headline}</a>
                    : <span style={{ color: C.text }}>{n.headline}</span>}
                </td>
                <td style={{ padding: '10px 16px', color: C.textDim }}>{n.source}</td>
                <td style={{ padding: '10px 16px' }}><Pill type={n.sentiment||'neutral'}>{n.sentiment||'—'}</Pill></td>
                <td style={{ padding: '10px 16px', color: C.textMid, fontVariantNumeric: 'tabular-nums' }}>
                  {n.confidence != null ? `${Math.round(n.confidence*100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {newsData.length > 100 && (
          <div style={{ textAlign: 'center', color: C.textDim, fontSize: 12, padding: '12px 0 8px' }}>
            Showing 100 of {newsData.length} articles
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0,10); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

// ─── Page config ──────────────────────────────────────────────────────────────
const PAGES = ['Dashboard','Analysis','Live Test','News'];
const PAGE_ICONS = [
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>,
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><polyline points="1,13 4,6 8,9 12,3 15,5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 4.5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M3 13.5c1.2-2 2.8-3 5-3s3.8 1 5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.3"/><line x1="6" y1="6" x2="6" y2="14" stroke="currentColor" strokeWidth="1.3"/></svg>,
];

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,   setPage]   = useState(0);
  const [symbol, setSymbol] = useState('AAPL');
  const [from,   setFrom]   = useState(daysAgo(30));
  const [to,     setTo]     = useState(todayStr());

  const [sentimentData,    setSentimentData]    = useState([]);
  const [priceData,        setPriceData]        = useState([]);
  const [newsData,         setNewsData]         = useState([]);
  const [distributionData, setDistributionData] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState(null);

  async function fetchAll(sym, f, t) {
    setLoading(true); setError(null);
    const [sR, pR, nR, dR] = await Promise.allSettled([
      fetch(`${API}/api/sentiment/trend?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
      fetch(`${API}/api/stocks/price?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
      fetch(`${API}/api/news?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
      fetch(`${API}/api/sentiment/distribution?symbol=${sym}&from=${f}&to=${t}`).then(r => r.json()),
    ]);
    setSentimentData(sR.status==='fulfilled' && Array.isArray(sR.value) ? sR.value : []);
    setPriceData(pR.status==='fulfilled'     && Array.isArray(pR.value) ? pR.value : []);
    setNewsData(nR.status==='fulfilled'      && Array.isArray(nR.value) ? nR.value : []);
    setDistributionData(dR.status==='fulfilled' ? dR.value : null);
    setLoading(false);
  }

  useEffect(() => { fetchAll(symbol, from, to); }, []);

  async function handleFetch() {
    setFetching(true); setFetchMsg(null); setError(null);
    try {
      const res = await fetch(`${API}/api/news/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, from, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setFetchMsg(`Done — ${data.inserted} new articles, ${data.scored} analyzed, ${data.pricesInserted} prices saved.`);
      await fetchAll(symbol, from, to);
    } catch (e) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  }

  const isEmpty = !sentimentData.length && !priceData.length && !newsData.length;
  const range   = dateRange(sentimentData, newsData) || `${from} – ${to}`;

  const pages = [
    <DashboardPage sentimentData={sentimentData} priceData={priceData} newsData={newsData} distributionData={distributionData} symbol={symbol}/>,
    <AnalysisPage  sentimentData={sentimentData} priceData={priceData} symbol={symbol}/>,
    <LiveTestPage/>,
    <NewsPage newsData={newsData}/>,
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter','SF Pro Display',-apple-system,sans-serif", overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 216, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
        borderRight: `1px solid ${C.border}`, padding: '0 10px',
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><polyline points="1,13 4,6 8,9 12,3 15,5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>SentimentAI</div>
            <div style={{ fontSize: 10, color: C.textDim }}>Financial Intelligence</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {PAGES.map((p,i) => (
            <NavItem key={p} label={p} active={page===i} icon={PAGE_ICONS[i]} onClick={() => setPage(i)}/>
          ))}
        </div>

        <div style={{ flex: 1 }}/>

        {/* Symbol picker */}
        <div style={{ padding: '14px 14px 18px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>Quick switch</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['AAPL','TSLA','NVDA'].map(s => (
              <div key={s} onClick={() => { setSymbol(s); fetchAll(s, from, to); }} style={{
                flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                background: s === symbol ? C.accent : C.border,
                color: s === symbol ? '#fff' : C.textMid,
                boxShadow: s === symbol ? `0 2px 12px ${C.accent}44` : 'none',
              }}>{s}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ padding: '18px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>{PAGES[page]}</h1>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{symbol} · {range} · {newsData.length} articles</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 12, width: 70, textTransform: 'uppercase', outline: 'none', letterSpacing: '0.05em', fontWeight: 600 }}/>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ padding: '7px 11px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: 12, outline: 'none', colorScheme: 'dark' }}/>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ padding: '7px 11px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textMid, fontSize: 12, outline: 'none', colorScheme: 'dark' }}/>
            <div onClick={() => !loading && !fetching && fetchAll(symbol, from, to)}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: `1px solid ${C.border}`, color: loading ? C.textDim : C.textMid, cursor: loading ? 'default' : 'pointer', transition: 'all .15s' }}>
              {loading ? 'Loading…' : 'Apply'}
            </div>
            <div onClick={() => !loading && !fetching && handleFetch()}
              style={{ padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: fetching ? C.accentDim : `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, color: '#fff', cursor: fetching ? 'default' : 'pointer', boxShadow: fetching ? 'none' : `0 2px 14px ${C.accent}44`, transition: 'all .2s' }}>
              {fetching ? 'Fetching…' : 'Fetch data'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {(loading || fetching) && (
          <div style={{ height: 2, background: `linear-gradient(90deg, ${C.accent}, ${C.sky}, ${C.accent})`, backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite', flexShrink: 0 }}/>
        )}

        {/* Alerts */}
        {fetchMsg && (
          <div style={{ margin: '14px 28px 0', padding: '11px 16px', borderRadius: 10, fontSize: 13, background: C.accentBg, color: C.accent, border: `1px solid ${C.accentDim}44`, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span>✓ {fetchMsg}</span>
            <span onClick={() => setFetchMsg(null)} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
          </div>
        )}
        {error && (
          <div style={{ margin: '14px 28px 0', padding: '11px 16px', borderRadius: 10, fontSize: 13, background: C.redBg, color: C.red, border: `1px solid ${C.red}33`, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span>Error: {error}</span>
            <span onClick={() => setError(null)} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !loading && !fetching && (
          <div style={{ margin: '40px 28px', padding: '60px 32px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 16, flexShrink: 0 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 20, color: C.text }}>No data loaded</h2>
            <p style={{ color: C.textMid, marginBottom: 24, fontSize: 14, maxWidth: 360, margin: '0 auto 24px' }}>
              Set a stock symbol and date range, then click <strong style={{ color: C.accent }}>Fetch data</strong> to pull news and run AI sentiment analysis.
            </p>
            <div onClick={() => { setSymbol('AAPL'); const f=daysAgo(30),t=todayStr(); setFrom(f); setTo(t); setTimeout(handleFetch,100); }}
              style={{ display: 'inline-block', padding: '10px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, color: '#fff', cursor: 'pointer', boxShadow: `0 4px 20px ${C.accent}44` }}>
              Quick Start — AAPL, last 30 days
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '20px 28px 48px', flex: 1 }}>
          {pages[page]}
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5) sepia(1) hue-rotate(200deg); opacity:.7; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius:3px; }
      `}</style>
    </div>
  );
}
