import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { C } from '../theme.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function SentimentChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 13 }}>
        No sentiment data — click <strong style={{ color: C.accent }}>Fetch data</strong> first.
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [{
      label: 'Avg sentiment',
      data: data.map(d => d.avgScore),
      borderColor: C.accent,
      backgroundColor: C.accentBg,
      fill: true,
      tension: 0.4,
      pointRadius: data.length > 30 ? 0 : 3,
      pointHoverRadius: 5,
      pointBackgroundColor: C.accent,
      borderWidth: 2,
    }],
  };

  const options = {
    responsive: true,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      title:  { display: false },
      tooltip: {
        backgroundColor: C.surface,
        borderColor: C.border,
        borderWidth: 1,
        titleColor: C.text,
        bodyColor: C.textMid,
        padding: 10,
        callbacks: {
          afterLabel: ctx => `Articles: ${data[ctx.dataIndex]?.count ?? ''}`,
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
        min: -1, max: 1,
        grid:  { color: C.border, drawBorder: false },
        ticks: { color: C.textMid, font: { size: 10 }, stepSize: 0.5 },
        border: { display: false },
        title: { display: true, text: 'Score', color: C.textDim, font: { size: 10 } },
      },
    },
  };

  return <Line data={chartData} options={options}/>;
}
