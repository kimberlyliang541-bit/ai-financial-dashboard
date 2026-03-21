import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const emptyStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: 200, color: '#9ca3af', fontSize: 14,
  border: '1px dashed #e5e7eb', borderRadius: 8,
};

export default function SentimentDistribution({ data }) {
  if (!data || (data.positive === 0 && data.negative === 0 && data.neutral === 0)) {
    return <div style={emptyStyle}>No sentiment data yet</div>;
  }

  const total = data.positive + data.negative + data.neutral;

  const chartData = {
    labels: ['Positive', 'Negative', 'Neutral'],
    datasets: [{
      data: [data.positive, data.negative, data.neutral],
      backgroundColor: ['#10b981', '#ef4444', '#9ca3af'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const options = {
    responsive: true,
    plugins: {
      title: { display: true, text: 'Sentiment Distribution' },
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.raw;
            const pct = ((value / total) * 100).toFixed(1);
            return ` ${ctx.label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  return <Doughnut data={chartData} options={options} />;
}
