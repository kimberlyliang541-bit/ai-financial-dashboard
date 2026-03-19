import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const emptyStyle = { display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#9ca3af', fontSize:14, border:'1px dashed #e5e7eb', borderRadius:8 };

export default function StockChart({ data, symbol }) {
  if (!data || data.length === 0) return <div style={emptyStyle}>No price data — add ALPHA_VANTAGE_API_KEY and click <strong>&nbsp;Fetch Data&nbsp;</strong>.</div>;

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: `${symbol} Close Price (USD)`,
        data: data.map(d => d.close),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: `${symbol} Stock Price` },
    },
    scales: {
      y: { title: { display: true, text: 'USD' } },
    },
  };

  return <Line data={chartData} options={options} />;
}
