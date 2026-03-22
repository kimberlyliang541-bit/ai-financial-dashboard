import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Common financial stop-words to exclude
const STOP_WORDS = new Set([
  'the','a','an','in','of','to','and','for','on','at','is','as','its','by',
  'be','has','it','this','that','with','from','are','was','were','will',
  'said','says','after','before','more','also','but','than','or','about',
]);

/**
 * Extract top N keywords from an array of news headlines.
 */
function extractKeywords(headlines, topN = 8) {
  const freq = {};
  for (const h of headlines) {
    const words = h.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    for (const w of words) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

const PALETTE = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6',
];

export default function KeywordChart({ headlines }) {
  const keywords = extractKeywords(headlines);

  if (keywords.length === 0) return <div className="chart-empty">No keywords — click <strong>&nbsp;Fetch Data&nbsp;</strong> first.</div>;

  const chartData = {
    labels: keywords.map(([w]) => w),
    datasets: [{
      data:            keywords.map(([, c]) => c),
      backgroundColor: PALETTE,
    }],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: 'Top Keywords in News' },
    },
  };

  return <Pie data={chartData} options={options} />;
}
