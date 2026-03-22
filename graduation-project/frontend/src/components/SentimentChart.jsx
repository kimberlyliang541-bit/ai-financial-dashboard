import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function SentimentChart({ data }) {
  if (!data || data.length === 0) return <div className="chart-empty">No data — click <strong>&nbsp;Fetch Data&nbsp;</strong> first.</div>;

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Avg Sentiment Score',
        data: data.map(d => d.avgScore),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Daily Sentiment Trend' },
      tooltip: {
        callbacks: {
          afterLabel: ctx => `News count: ${data[ctx.dataIndex]?.count ?? ''}`,
        },
      },
    },
    scales: {
      y: { min: -1, max: 1, title: { display: true, text: 'Score' } },
    },
  };

  return <Line data={chartData} options={options} />;
}
