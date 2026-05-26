import { useState } from 'react';
import { C } from '../theme.js';

const API = import.meta.env.VITE_API_URL || '';

function computePearson(sentimentData, priceData) {
  if (!sentimentData?.length || !priceData?.length) return null;
  const sm = Object.fromEntries(sentimentData.map(d => [d.date, d.avgScore]));
  const pm = Object.fromEntries(priceData.map(d => [d.date, d.close]));
  const dates = [...new Set([...Object.keys(sm), ...Object.keys(pm)])].sort();
  const pairs = dates
    .map(d => [sm[d], pm[d]])
    .filter(([a, b]) => a != null && b != null);
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const [sx, sy, sxy, sx2, sy2] = pairs.reduce(
    ([a, b, c, d, e], [x, y]) => [a+x, b+y, c+x*y, d+x*x, e+y*y],
    [0, 0, 0, 0, 0]
  );
  const den = Math.sqrt((n*sx2 - sx*sx) * (n*sy2 - sy*sy));
  return den === 0 ? 0 : (n*sxy - sx*sy) / den;
}

export default function InsightReport({ symbol, from, to, sentimentData, priceData, distribution }) {
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const canGenerate = sentimentData?.length > 0;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = computePearson(sentimentData, priceData);
      const pearsonR = r !== null ? r.toFixed(2) : 'N/A';

      const sentimentSummary = (sentimentData || [])
        .map(d => `${d.date}: ${d.avgScore.toFixed(2)} (${d.count} articles)`)
        .join('\n');

      const priceSummary = (priceData || [])
        .slice(-14)
        .map(d => `${d.date}: $${d.close}`)
        .join('\n');

      const res = await fetch(`${API}/api/sentiment/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol, from, to,
          sentimentSummary,
          priceSummary,
          distribution: distribution || { positive: 0, negative: 0, neutral: 0 },
          pearsonR,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReport(data.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: C.surface,
      borderRadius: 12,
      padding: '20px 24px',
      border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 4 }}>
            AI Insight Report
          </div>
          <div style={{ fontSize: 11, color: C.textDim }}>
            AI-generated analysis of sentiment and price correlation
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: loading || !canGenerate ? 'default' : 'pointer',
            background: loading || !canGenerate
              ? C.border
              : `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
            color: loading || !canGenerate ? C.textDim : '#fff',
            fontWeight: 600,
            fontSize: 12,
            transition: 'all .2s',
            boxShadow: loading || !canGenerate ? 'none' : `0 2px 12px ${C.accent}44`,
            flexShrink: 0,
          }}
        >
          {loading ? 'Analyzing…' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 12,
          background: C.redBg, color: C.red, border: `1px solid ${C.red}33`,
          marginBottom: 12,
        }}>
          Error: {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: C.textDim, fontSize: 13 }}>
          <div style={{ animation: 'pulse 1.4s ease-in-out infinite' }}>
            Generating report…
          </div>
        </div>
      )}

      {report && !loading && (
        <div style={{
          fontSize: 13,
          lineHeight: 1.8,
          color: C.text,
          whiteSpace: 'pre-wrap',
          borderTop: `1px solid ${C.border}`,
          paddingTop: 14,
        }}>
          {report}
        </div>
      )}

      {!report && !loading && !error && (
        <div style={{ fontSize: 12, color: C.textDim, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          {canGenerate
            ? 'Click "Generate Report" to get an AI-powered analysis of the sentiment-price correlation.'
            : 'Load data first before generating a report.'}
        </div>
      )}
    </div>
  );
}
