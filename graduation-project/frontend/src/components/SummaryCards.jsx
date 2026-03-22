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
    stable:    { label: '→ Stable',    color: '#64748b' },
  };

  const avgColor = avg === null ? '#94a3b8' : avg >= 0.1 ? '#10b981' : avg <= -0.1 ? '#ef4444' : '#64748b';

  return (
    <div className="summary-grid">
      <div className="summary-card">
        <div className="summary-label">Avg sentiment</div>
        <div className="summary-value" style={{ color: avgColor }}>
          {avg === null ? '—' : (avg >= 0 ? '+' : '') + avg.toFixed(2)}
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-label">Articles analyzed</div>
        <div className="summary-value" style={{ color: '#334155' }}>
          {newsData.length}
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-label">Sentiment trend</div>
        <div className="summary-value" style={{ color: trendConfig[trend].color }}>
          {trendConfig[trend].label}
        </div>
      </div>
    </div>
  );
}
