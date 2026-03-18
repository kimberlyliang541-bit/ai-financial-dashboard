import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LABEL_COLOR = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral:  '#6b7280',
};

export default function LiveAnalysis() {
  const [text,    setText]    = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch(`${API}/api/sentiment/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, maxWidth: 640 }}>
      <h3 style={{ marginTop: 0 }}>Live Sentiment Analysis</h3>
      <textarea
        rows={4}
        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db', resize: 'vertical' }}
        placeholder="Paste any English financial news headline or text…"
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={loading}
      />
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
          style={{ padding: '8px 20px', borderRadius: 4, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
        <button
          onClick={() => { setText(''); setResult(null); setError(''); }}
          style={{ padding: '8px 12px', borderRadius: 4, background: '#f3f4f6', border: 'none', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      {error && <p style={{ color: '#ef4444', marginTop: 12 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 6 }}>
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 12,
            background: LABEL_COLOR[result.sentiment], color: '#fff', fontWeight: 600, textTransform: 'capitalize',
          }}>
            {result.sentiment}
          </span>
          {' '}
          <span style={{ color: '#6b7280' }}>Confidence: {Math.round(result.confidence * 100)}%</span>
          <p style={{ marginTop: 8, marginBottom: 0, fontStyle: 'italic' }}>&ldquo;{result.reason}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
