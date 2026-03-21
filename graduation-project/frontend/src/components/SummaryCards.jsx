export default function SummaryCards({ sentimentData, newsData }) {
  if (!newsData || newsData.length === 0) return null;

  const avg = sentimentData.length > 0
    ? sentimentData.reduce((sum, d) => sum + d.avgScore, 0) / sentimentData.length
    : null;

  let trend = 'stable';
  if (sentimentData.length >= 4) {
    const mid = Math.floor(sentimentData.length / 2);
    const firstHalf  = sentimentData.slice(0, mid).reduce((s, d) => s + d.avgScore, 0) / mid;
    const secondHalf = sentimentData.slice(mid).reduce((s, d) => s + d.avgScore, 0) / (sentimentData.length - mid);
    if (secondHalf - firstHalf > 0.1) trend = 'rising';
    else if (firstHalf - secondHalf > 0.1) trend = 'declining';
  }

  const trendConfig = {
    rising:    { label: '↑ Rising',    color: '#10b981' },
    declining: { label: '↓ Declining', color: '#ef4444' },
    stable:    { label: '→ Stable',    color: '#6b7280' },
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 8 }}>
      <div style={card}>
        <div style={labelStyle}>Avg sentiment</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: avg === null ? '#9ca3af' : avg >= 0 ? '#10b981' : '#ef4444' }}>
          {avg === null ? '—' : (avg >= 0 ? '+' : '') + avg.toFixed(2)}
        </div>
      </div>
      <div style={card}>
        <div style={labelStyle}>Articles analyzed</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: '#374151' }}>
          {newsData.length}
        </div>
      </div>
      <div style={card}>
        <div style={labelStyle}>Sentiment trend</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: trendConfig[trend].color }}>
          {trendConfig[trend].label}
        </div>
      </div>
    </div>
  );
}

const card = {
  background: '#f9fafb', borderRadius: 10, padding: '16px 20px',
};
const labelStyle = {
  fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 4,
};
