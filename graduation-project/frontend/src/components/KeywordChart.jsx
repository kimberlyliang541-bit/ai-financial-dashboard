import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { C } from '../theme.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const STOP_WORDS = new Set([
  'the','a','an','in','of','to','and','for','on','at','is','as','its','by',
  'be','has','it','this','that','with','from','are','was','were','will',
  'said','says','after','before','more','also','but','than','or','about',
]);

function extractKeywords(headlines, topN = 8) {
  const freq = {};
  for (const h of headlines) {
    const words = h.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/);
    for (const w of words) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, topN);
}

// Muted but distinct colors that work on dark bg
const PALETTE = [
  C.accent,       // indigo
  C.sky,          // sky blue
  C.amber,        // amber
  C.pos,          // green
  '#c084fc',      // purple
  '#f472b6',      // pink
  '#2dd4bf',      // teal
  '#facc15',      // yellow
];

export default function KeywordChart({ headlines }) {
  const keywords = extractKeywords(headlines);

  if (keywords.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 13 }}>
        No keywords — load articles first.
      </div>
    );
  }

  const chartData = {
    labels: keywords.map(([w]) => w),
    datasets: [{
      data: keywords.map(([,c]) => c),
      backgroundColor: PALETTE.map(col => col + 'cc'),
      borderColor:     C.surface,
      borderWidth: 2,
      hoverBorderColor: C.borderHi,
    }],
  };

  const options = {
    responsive: true,
    plugins: {
      title: { display: false },
      legend: {
        position: 'right',
        labels: {
          color: C.textMid,
          usePointStyle: true,
          pointStyleWidth: 8,
          boxHeight: 8,
          font: { size: 11 },
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: C.surface,
        borderColor: C.border,
        borderWidth: 1,
        titleColor: C.text,
        bodyColor: C.textMid,
        padding: 10,
      },
    },
  };

  return <Pie data={chartData} options={options}/>;
}
