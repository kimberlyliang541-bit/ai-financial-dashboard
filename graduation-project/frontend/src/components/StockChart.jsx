import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const emptyStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: 200, color: '#9ca3af', fontSize: 14,
  border: '1px dashed #e5e7eb', borderRadius: 8,
};

/**
 * 计算 N 日移动平均线
 */
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
    return <div style={emptyStyle}>No price data — click <strong>&nbsp;Fetch Data&nbsp;</strong> first.</div>;
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
      // High-Low Band：high 线（fill 到下一个 dataset Low）
      {
        label: 'High',
        data: highs,
        borderColor: 'transparent',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        fill: '+1',
        pointRadius: 0,
        tension: 0.3,
      },
      // Low 线（隐藏，作为 fill 下界）
      {
        label: 'Low',
        data: lows,
        borderColor: 'transparent',
        fill: false,
        pointRadius: 0,
        tension: 0.3,
      },
      // Close 主线
      {
        label: 'Close',
        data: closes,
        borderColor: '#10b981',
        borderWidth: 2,
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: false,
        pointRadius: 1.5,
        pointHoverRadius: 5,
        tension: 0.3,
      },
      // MA5 虚线
      {
        label: 'MA5',
        data: ma5,
        borderColor: '#f59e0b',
        borderWidth: 1.5,
        borderDash: [6, 3],
        fill: false,
        pointRadius: 0,
        tension: 0.3,
      },
      // MA20 虚线
      {
        label: 'MA20',
        data: ma20,
        borderColor: '#8b5cf6',
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
          filter: (item) => !['High', 'Low'].includes(item.text),
          usePointStyle: true,
          pointStyleWidth: 10,
          boxHeight: 7,
          font: { size: 11 },
        },
      },
      title: { display: true, text: `${symbol} Stock Price`, font: { size: 14 } },
      tooltip: {
        callbacks: {
          afterTitle: (items) => {
            const i = items[0]?.dataIndex;
            if (i == null) return '';
            return `Open: ${data[i]?.open?.toFixed(2)}  High: ${data[i]?.high?.toFixed(2)}\nLow: ${data[i]?.low?.toFixed(2)}   Close: ${data[i]?.close?.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      y: { title: { display: true, text: 'USD' } },
      x: { ticks: { maxTicksLimit: 10, font: { size: 10 } } },
    },
  };

  return <Line data={chartData} options={options} />;
}
