import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { C } from '../theme.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function normalize(arr) {
  const valid = arr.filter(v => v !== null);
  const min = Math.min(...valid), max = Math.max(...valid);
  if (max === min) return arr.map(v => v === null ? null : 0);
  return arr.map(v => v === null ? null : ((v - min) / (max - min)) * 2 - 1);
}

function pearson(x, y) {
  const pairs = [];
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== null && y[i] !== null) pairs.push([x[i], y[i]]);
  }
  const n = pairs.length;
  if (n < 3) return null;
  const [sx, sy, sxy, sx2, sy2] = pairs.reduce(
    ([a,b,c,d,e],[px,py]) => [a+px,b+py,c+px*py,d+px*px,e+py*py],[0,0,0,0,0]
  );
  const num = n*sxy - sx*sy;
  const den = Math.sqrt((n*sx2 - sx*sx) * (n*sy2 - sy*sy));
  return den === 0 ? 0 : num/den;
}

export default function OverlayChart({ sentimentData, priceData, symbol }) {
  const hasSent  = sentimentData?.length > 0;
  const hasPrice = priceData?.length > 0;

  if (!hasSent && !hasPrice) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 13 }}>
        No data — click <strong style={{ color: C.accent }}>Fetch data</strong> first.
      </div>
    );
  }

  const dates = [...new Set([
    ...(hasSent  ? sentimentData.map(d => d.date) : []),
    ...(hasPrice ? priceData.map(d => d.date)     : []),
  ])].sort();

  const sm = hasSent  ? Object.fromEntries(sentimentData.map(d => [d.date, d.avgScore])) : {};
  const pm = hasPrice ? Object.fromEntries(priceData.map(d => [d.date, d.close]))        : {};

  const rawSent   = dates.map(d => sm[d] ?? null);
  const rawPrices = dates.map(d => pm[d] ?? null);
  const normPrices = normalize(rawPrices);

  const r = (hasSent && hasPrice) ? pearson(rawSent, normPrices) : null;

  const chartData = {
    labels: dates,
    datasets: [
      ...(hasSent ? [{
        label: 'Sentiment score',
        data: rawSent,
        borderColor: C.accent,
        backgroundColor: C.accentBg,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: dates.length > 30 ? 0 : 2,
        pointHoverRadius: 5,
      }] : []),
      ...(hasPrice ? [{
        label: `${symbol} price (normalized)`,
        data: normPrices,
        borderColor: C.amber,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: dates.length > 30 ? 0 : 2,
        pointHoverRadius: 5,
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: C.textMid,
          usePointStyle: true,
          pointStyleWidth: 10,
          boxHeight: 6,
          font: { size: 11 },
        },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: C.surface,
        borderColor: C.border,
        borderWidth: 1,
        titleColor: C.text,
        bodyColor: C.textMid,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid:  { color: C.border, drawBorder: false },
        ticks: { color: C.textDim, font: { size: 10 }, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        min: -1, max: 1,
        grid:  { color: C.border, drawBorder: false },
        ticks: { color: C.textMid, font: { size: 10 }, stepSize: 0.5 },
        border: { display: false },
        title: { display: true, text: 'Score / Normalized', color: C.textDim, font: { size: 10 } },
      },
    },
  };

  return (
    <div>
      {!hasSent  && <div style={{ padding: '8px 12px', marginBottom:12, background: C.redBg,     color: C.red,     borderRadius:8, fontSize:12 }}>Sentiment data unavailable — showing price only.</div>}
      {!hasPrice && <div style={{ padding: '8px 12px', marginBottom:12, background: C.accentBg,   color: C.textMid, borderRadius:8, fontSize:12 }}>Price data unavailable — showing sentiment only.</div>}
      <Line data={chartData} options={options}/>
    </div>
  );
}
