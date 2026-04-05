问题 1：.env 缺少 ALPHA_VANTAGE_API_KEY
当前 .env 只有 FINNHUB 和 SILICONFLOW 两个 key。
虽然 stock_prices 有 160 条（说明之前手动跑通过），但 .env 里没有持久化这个 key，换台电脑或重新部署就又失效了。
修复： .env 补上 ALPHA_VANTAGE_API_KEY=你的key
问题 2：mock-AAPL.json 是空数组
json[]
答辩兜底失效。需要填入真实数据。
修复： 从数据库导出现有股价数据作为 mock：
bashcd backend
node -e "
const db = require('./db/database');
const rows = db.prepare('SELECT date,open,close,high,low FROM stock_prices WHERE symbol=? ORDER BY date').all('AAPL');
require('fs').writeFileSync('data/mock-AAPL.json', JSON.stringify(rows, null, 2));
console.log('Exported', rows.length, 'records');
"
问题 3：news.js 没有限流保护
AI 分析循环里没有延迟，SiliconFlow 限流导致 356 条新闻还没分析完。
修复： 在 news.js 第 83-91 行的 for 循环里加延迟：
javascriptfor (const { id: newsId, headline } of unscored) {
  try {
    const score = await analyzeSentiment(headline);
    insertScore.run(newsId, score.sentiment, score.confidence, score.reason);
    scored++;
    // 防限流：每条间隔 500ms
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    console.error(`Sentiment analysis failed for news ${newsId}:`, e.message);
    // 限流时等 5 秒
    if (e.message.includes('429') || e.message.includes('rate')) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}
问题 4：240 条新闻没有 related_symbol
数据库里有 240 条 related_symbol = NULL 的新闻。这些不会被任何查询命中（因为所有查询都按 symbol 过滤）。不影响功能，但浪费了分析配额。答辩时可以不管。
问题 5：AI Insight Report 还没做
这是让项目从"数据展示"升级为"AI 分析平台"的关键缺失。
问题 6：文档仍有过期内容
CLAUDE.md 和 README.md 里还有 Groq 字样。

四、核心功能设计：OverlayChart + AI Insight Report
4.1 OverlayChart 是最重要的图吗？
是的。 原因是：其他图（SentimentChart、StockChart、Distribution、Keywords）都是单维度展示，任何人一看就会说"嗯，然后呢？"。只有 OverlayChart 回答了"然后呢"——它把两个维度叠加在一起，用 Pearson r 量化了关联。
怎么让它更好看、更有说服力：
当前的 OverlayChart 已经有 Pearson r 了，但只是放在标题里。升级方案：

在图表上方增加一个醒目的相关系数卡片：

┌──────────────────────────────────────────────────┐
│  Pearson Correlation                             │
│  r = 0.42         Moderate positive              │
│  ━━━━━━━━━━━○━━━━━━━━━━                          │
│  -1        0        +1                           │
│                                                  │
│  "News sentiment and AAPL stock price show a     │
│   moderate positive correlation during this       │
│   period — positive news tends to coincide        │
│   with price increases."                         │
└──────────────────────────────────────────────────┘
│            [图表在这下面]                          │

图表本身增加数据点标注——在情绪分数最低的那天和最高的那天标注日期。
数据来源确实可以更丰富——你已经有 AAPL 和 TSLA 两个 symbol，可以加一个 symbol 切换的交互，对比"AAPL 情绪-股价相关性 vs TSLA 情绪-股价相关性"。

4.2 AI Insight Report 怎么做
后端新增 generateText 函数和 /api/sentiment/report 路由。
前端新增 InsightReport.jsx 组件。
后端 — aiService.js 新增：
javascriptasync function generateText(prompt) {
  const res = await fetch(SILICONFLOW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });
  if (!res.ok) throw new Error(`SiliconFlow error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

module.exports = { analyzeSentiment, generateText };
后端 — sentiment.js 新增路由：
javascriptconst { analyzeSentiment, generateText } = require('../services/aiService');

// POST /api/sentiment/report
router.post('/report', async (req, res) => {
  const { symbol, from, to, sentimentSummary, priceSummary, distribution, pearsonR } = req.body;

  const prompt = `You are a financial analyst. Write a brief analysis report (3 short paragraphs, each 2-3 sentences) based on:

Symbol: ${symbol} | Period: ${from} to ${to}

Sentiment data (daily avg score, -1 to +1):
${sentimentSummary}

Stock price data (daily close, USD):
${priceSummary}

Distribution: ${distribution.positive} positive, ${distribution.negative} negative, ${distribution.neutral} neutral articles
Pearson correlation coefficient: ${pearsonR}

Paragraph 1 - SENTIMENT TREND: Describe the overall sentiment direction. Any notable shifts?
Paragraph 2 - CORRELATION FINDING: Interpret the Pearson r value. Do sentiment and price move together?
Paragraph 3 - OUTLOOK: Based on recent sentiment momentum, what's the short-term mood?

Be specific with numbers. Keep it concise.`;

  try {
    const report = await generateText(prompt);
    res.json({ report });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
前端 — InsightReport.jsx：
jsximport { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export default function InsightReport({ symbol, from, to, sentimentData, priceData, distribution }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canGenerate = sentimentData?.length > 0;

  // 计算 Pearson r（复用 OverlayChart 的逻辑）
  function calcR() {
    if (!sentimentData?.length || !priceData?.length) return 'N/A';
    const sentMap = Object.fromEntries(sentimentData.map(d => [d.date, d.avgScore]));
    const priceMap = Object.fromEntries(priceData.map(d => [d.date, d.close]));
    const dates = [...new Set([...Object.keys(sentMap), ...Object.keys(priceMap)])].sort();
    const pairs = dates.map(d => [sentMap[d], priceMap[d]]).filter(([a, b]) => a != null && b != null);
    if (pairs.length < 3) return 'N/A';
    const n = pairs.length;
    const sx = pairs.reduce((s, p) => s + p[0], 0);
    const sy = pairs.reduce((s, p) => s + p[1], 0);
    const sxy = pairs.reduce((s, p) => s + p[0]*p[1], 0);
    const sx2 = pairs.reduce((s, p) => s + p[0]**2, 0);
    const sy2 = pairs.reduce((s, p) => s + p[1]**2, 0);
    const den = Math.sqrt((n*sx2 - sx**2) * (n*sy2 - sy**2));
    return den === 0 ? '0.00' : ((n*sxy - sx*sy) / den).toFixed(2);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/sentiment/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol, from, to,
          sentimentSummary: sentimentData.map(d => `${d.date}: ${d.avgScore.toFixed(2)} (${d.count} articles)`).join('\n'),
          priceSummary: priceData.slice(-14).map(d => `${d.date}: $${d.close}`).join('\n'),
          distribution: distribution || { positive: 0, negative: 0, neutral: 0 },
          pearsonR: calcR(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      borderRadius: 12, padding: '24px 28px',
      border: '1px solid #ddd6fe',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#4c1d95' }}>
            AI Insight Report
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7c3aed' }}>
            AI analyzes all sentiment and price data, then writes a conclusion
          </p>
        </div>
        <button onClick={handleGenerate} disabled={loading || !canGenerate}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: loading ? '#a78bfa' : '#7c3aed', color: '#fff',
            fontWeight: 600, fontSize: 14,
          }}>
          {loading ? 'Analyzing...' : 'Generate Report'}
        </button>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

      {report && (
        <div style={{
          background: '#fff', borderRadius: 8, padding: '20px 24px',
          fontSize: 14, lineHeight: 1.8, color: '#374151',
          whiteSpace: 'pre-wrap',
        }}>
          {report}
        </div>
      )}

      {!report && !loading && (
        <p style={{ color: '#8b5cf6', fontSize: 13, margin: 0 }}>
          Click "Generate Report" to see AI-powered analysis of sentiment-price correlation.
        </p>
      )}
    </div>
  );
}
App.jsx 中接入：
在 OverlayChart 下方加：
jsximport InsightReport from './components/InsightReport';

// 在 OverlayChart 的 div 后面
<div style={{ marginBottom: 24 }}>
  <InsightReport
    symbol={symbol} from={from} to={to}
    sentimentData={sentimentData}
    priceData={priceData}
    distribution={distributionData}
  />
</div>

五、OverlayChart 升级——增加相关系数可视化卡片
在 OverlayChart.jsx 现有代码基础上，在 <Line> 图表上方加一个相关系数展示区：
在 return 语句里的 {warning && ...} 后面、<Line> 前面插入：
jsx{r !== null && (
  <div style={{
    display: 'flex', gap: 20, alignItems: 'center',
    padding: '12px 16px', marginBottom: 12,
    background: '#f5f3ff', borderRadius: 8, border: '1px solid #e9e5ff',
  }}>
    <div>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>PEARSON r</div>
      <div style={{
        fontSize: 32, fontWeight: 700,
        color: Math.abs(r) > 0.4 ? (r > 0 ? '#10b981' : '#ef4444') : '#6b7280',
      }}>
        {r.toFixed(2)}
      </div>
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
        {correlationLabel(r)}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
        {interpretCorrelation(r, symbol)}
      </div>
    </div>
  </div>
)}
同时在 OverlayChart.jsx 里加上这个函数：
javascriptfunction interpretCorrelation(r, symbol) {
  const abs = Math.abs(r);
  if (abs < 0.2) return `During this period, ${symbol} sentiment and stock price show almost no linear correlation. Sentiment alone does not explain price movements.`;
  const dir = r >= 0 ? 'positive' : 'negative';
  const strength = abs > 0.7 ? 'strong' : abs > 0.4 ? 'moderate' : 'weak';
  return `${symbol} shows a ${strength} ${dir} correlation between news sentiment and stock price — ${dir === 'positive' ? 'positive news tends to coincide with price increases' : 'negative sentiment tends to coincide with price decreases'}.`;
}

六、补完数据
补分析 356 条未分析的新闻
在 news.js 加了延迟保护之后，重新点 Fetch Data。
或者用 seed 脚本分两批跑：
bashcd backend
node scripts/seed.js AAPL 2026-03-11 2026-03-21
# 等完成后
node scripts/seed.js TSLA 2026-03-11 2026-03-21
填充 mock-AAPL.json
从数据库导出真实数据作为 mock（见第三部分问题 2 的修复命令）。

七、执行顺序
步骤 1 ── news.js 加限流延迟（3 行代码）
步骤 2 ── .env 补 ALPHA_VANTAGE_API_KEY
步骤 3 ── 导出 mock-AAPL.json 真实数据
步骤 4 ── 重启后端，跑 seed.js 补完 356 条分析
          ✅ 数据完整

步骤 5 ── OverlayChart 加相关系数卡片 + interpretCorrelation
          ✅ 核心图表升级

步骤 6 ── aiService.js 新增 generateText
步骤 7 ── sentiment.js 新增 /report 路由
步骤 8 ── 新增 InsightReport.jsx
步骤 9 ── App.jsx 接入 InsightReport（放在 OverlayChart 下方）
          ✅ AI 分析报告完成

步骤 10 ── CLAUDE.md / README.md 更新 Groq → SiliconFlow
           ✅ 文档清理完成