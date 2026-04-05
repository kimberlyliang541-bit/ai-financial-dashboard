import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { C } from '../theme.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SentimentDistribution({ data }) {
  if (!data || (data.positive === 0 && data.negative === 0 && data.neutral === 0)) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 13 }}>
        No distribution data yet.
      </div>
    );
  }

  const total = data.positive + data.negative + data.neutral;

  const chartData = {
    labels: ['Positive', 'Negative', 'Neutral'],
    datasets: [{
      data: [data.positive, data.negative, data.neutral],
      backgroundColor: [C.pos, C.red, C.textDim],
      borderColor: C.surface,
      borderWidth: 3,
      hoverBorderColor: C.borderHi,
    }],
  };

  const options = {
    responsive: true,
    cutout: '62%',
    plugins: {
      title: { display: false },
      legend: {
        position: 'bottom',
        labels: {
          color: C.textMid,
          usePointStyle: true,
          pointStyleWidth: 10,
          boxHeight: 7,
          font: { size: 11 },
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: C.surface,
        borderColor: C.border,
        borderWidth: 1,
        titleColor: C.text,
        bodyColor: C.textMid,
        padding: 10,
        callbacks: {
          label: ctx => {
            const pct = ((ctx.raw / total) * 100).toFixed(1);
            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
          },
        },
      },
    },
  };

  return <Doughnut data={chartData} options={options}/>;
}
