import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * Normalize an array of numbers to the range [0, 1].
 */
function normalize(arr) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (max === min) return arr.map(() => 0.5);
  return arr.map(v => (v - min) / (max - min));
}

export default function OverlayChart({ sentimentData, priceData, symbol }) {
  // Align by date
  const dateSet   = [...new Set([...sentimentData.map(d => d.date), ...priceData.map(d => d.date)])].sort();
  const sentMap   = Object.fromEntries(sentimentData.map(d => [d.date, d.avgScore]));
  const priceMap  = Object.fromEntries(priceData.map(d => [d.date, d.close]));

  const rawPrices = dateSet.map(d => priceMap[d] ?? null);
  const normPrices = normalize(rawPrices.filter(v => v !== null));

  let ni = 0;
  const normalizedPrices = rawPrices.map(v => (v !== null ? normPrices[ni++] : null));

  const chartData = {
    labels: dateSet,
    datasets: [
      {
        label: 'Sentiment Score',
        data: dateSet.map(d => sentMap[d] ?? null),
        borderColor: 'rgb(99, 102, 241)',
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: `${symbol} Price (normalized)`,
        data: normalizedPrices,
        borderColor: 'rgb(16, 185, 129)',
        tension: 0.3,
        yAxisID: 'y',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Sentiment vs. Stock Price' },
    },
    scales: {
      y: { min: -1, max: 1, title: { display: true, text: 'Score / Normalized Price' } },
    },
  };

  return <Line data={chartData} options={options} />;
}
