import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { C } from '../theme.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function calcMA(closes, period) {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    return sum / period;
  });
}

export default function StockChart({ data, symbol }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 13 }}>
        No price data — click <strong style={{ color: C.accent }}>Fetch data</strong> first.
      </div>
    );
  }

  const labels = data.map(d => d.date);
  const closes = data.map(d => d.close);
  const highs  = data.map(d => d.high);
  const lows   = data.map(d => d.low);
  const ma5    = calcMA(closes, 5);
  const ma20   = calcMA(closes, 20);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'High',
        data: highs,
        borderColor: 'transparent',
        backgroundColor: 'rgba(217,119,6,0.06)',
        fill: '+1',
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Low',
        data: lows,
        borderColor: 'transparent',
        fill: false,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Close',
        data: closes,
        borderColor: C.chartClose,
        borderWidth: 2,
        backgroundColor: 'rgba(251,146,60,0.05)',
        fill: false,
        pointRadius: data.length > 30 ? 0 : 2,
        pointHoverRadius: 5,
        pointBackgroundColor: C.chartClose,
        tension: 0.3,
      },
      {
        label: 'MA5',
        data: ma5,
        borderColor: C.amber,
        borderWidth: 1.5,
        borderDash: [5, 3],
        fill: false,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'MA20',
        data: ma20,
        borderColor: C.chartMA20,
        borderWidth: 1.5,
        borderDash: [10, 5],
        fill: false,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          filter: item => !['High','Low'].includes(item.text),
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
        callbacks: {
          afterTitle: items => {
            const i = items[0]?.dataIndex;
            if (i == null) return '';
            return `O: ${data[i]?.open?.toFixed(2)}  H: ${data[i]?.high?.toFixed(2)}\nL: ${data[i]?.low?.toFixed(2)}   C: ${data[i]?.close?.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid:  { color: C.border, drawBorder: false },
        ticks: { color: C.textDim, font: { size: 10 }, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        grid:  { color: C.border, drawBorder: false },
        ticks: { color: C.textMid, font: { size: 10 } },
        border: { display: false },
        title: { display: true, text: 'USD', color: C.textDim, font: { size: 10 } },
      },
    },
  };

  return <Line data={chartData} options={options}/>;
}
