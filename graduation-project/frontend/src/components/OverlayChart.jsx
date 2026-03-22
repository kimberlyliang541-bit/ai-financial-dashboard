import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function normalize(arr) {
  const valid = arr.filter(v => v !== null);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return arr.map(v => (v === null ? null : 0));
  return arr.map(v => (v === null ? null : ((v - min) / (max - min)) * 2 - 1));
}

/**
 * Pearson 相关系数（只取两边都有值的日期）
 */
function pearson(x, y) {
  const pairs = [];
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== null && y[i] !== null) pairs.push([x[i], y[i]]);
  }
  const n = pairs.length;
  if (n < 3) return null;
  const sumX  = pairs.reduce((s, p) => s + p[0], 0);
  const sumY  = pairs.reduce((s, p) => s + p[1], 0);
  const sumXY = pairs.reduce((s, p) => s + p[0] * p[1], 0);
  const sumX2 = pairs.reduce((s, p) => s + p[0] ** 2, 0);
  const sumY2 = pairs.reduce((s, p) => s + p[1] ** 2, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  return den === 0 ? 0 : num / den;
}

function correlationLabel(r) {
  if (r === null) return '';
  const abs = Math.abs(r);
  let strength = 'Weak';
  if (abs > 0.7) strength = 'Strong';
  else if (abs > 0.4) strength = 'Moderate';
  const direction = r >= 0 ? 'positive' : 'negative';
  return `r = ${r.toFixed(2)} (${strength} ${direction})`;
}


export default function OverlayChart({ sentimentData, priceData, symbol }) {
  const hasSentiment = sentimentData && sentimentData.length > 0;
  const hasPrice     = priceData && priceData.length > 0;

  if (!hasSentiment && !hasPrice) {
    return <div className="chart-empty">No data — click <strong>&nbsp;Fetch Data&nbsp;</strong> first.</div>;
  }

  let warning = null;
  if (!hasPrice)     warning = 'Stock price data unavailable — showing sentiment only.';
  if (!hasSentiment) warning = 'No sentiment data — showing normalized stock price only.';

  const dateSet = [...new Set([
    ...(hasSentiment ? sentimentData.map(d => d.date) : []),
    ...(hasPrice ? priceData.map(d => d.date) : []),
  ])].sort();

  const sentMap  = hasSentiment ? Object.fromEntries(sentimentData.map(d => [d.date, d.avgScore])) : {};
  const priceMap = hasPrice ? Object.fromEntries(priceData.map(d => [d.date, d.close])) : {};

  const rawSent    = dateSet.map(d => sentMap[d] ?? null);
  const rawPrices  = dateSet.map(d => priceMap[d] ?? null);
  const normPrices = normalize(rawPrices);

  const r = (hasSentiment && hasPrice) ? pearson(rawSent, normPrices) : null;

  const chartData = {
    labels: dateSet,
    datasets: [
      ...(hasSentiment ? [{
        label: 'Sentiment score',
        data: rawSent,
        borderColor: '#6366f1',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
      }] : []),
      ...(hasPrice ? [{
        label: `${symbol} price (normalized)`,
        data: normPrices,
        borderColor: '#10b981',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
      }] : []),
    ],
  };

  const titleText = r !== null
    ? `Sentiment vs. Stock Price — ${correlationLabel(r)}`
    : 'Sentiment vs. Stock Price';

  const options = {
    responsive: true,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        position: 'top',
        labels: { usePointStyle: true, pointStyleWidth: 10, boxHeight: 7, font: { size: 11 } },
      },
      title: { display: true, text: titleText, font: { size: 14 } },
    },
    scales: {
      y: { min: -1, max: 1, title: { display: true, text: 'Score / Normalized Price' } },
      x: { ticks: { maxTicksLimit: 10, font: { size: 10 } } },
    },
  };

  return (
    <div>
      {warning && <div className="alert alert-warn" style={{ marginBottom: 12 }}>{warning}</div>}
      <Line data={chartData} options={options} />
    </div>
  );
}
