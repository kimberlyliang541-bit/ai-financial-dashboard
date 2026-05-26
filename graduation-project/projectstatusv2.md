# Project Status v2
> 更新：2026-04-14 | 全量代码审查

---

## 用户反馈问题（已确认）

### BUG-A：图表走势线不连贯 / 有截断
**影响文件：** `frontend/src/components/SentimentChart.jsx`、`OverlayChart.jsx`

**根因：** Chart.js 默认不跨 `null` 连线。当某天没有新闻或情绪分析失败时，该天没有数据点，Chart.js 直接断线。OverlayChart 的情绪线与股价线日期不完全对齐时也会出现断点。

**具体表现：**
- SentimentChart：情绪趋势线在无新闻的日期（周末/节假日/AI 分析失败日）出现断口
- OverlayChart：情绪线与股价线在日期不重叠处各自截断
- StockChart：MA5/MA20 前几天因数据不足为 null，线从中间才开始画，视觉上像截断

**修复方法：** 在所有折线 dataset 加 `spanGaps: true`，让 Chart.js 跨 null 连线。

---

### BUG-B：情绪分析没有跑完全部新闻
**影响文件：** `backend/routes/news.js`、`backend/services/aiService.js`

**根因（多层叠加）：**
1. **API Key 额度耗尽**（主因）：之前的 Key `sk-pceu...` 已用完，所有模型返回 403，导致大批新闻分析失败，只记录了 error，没有 sentiment_score 记录
2. **模型列表过期**：`THUDM/GLM-4-9B-0414`（按日期命名的版本）和 `deepseek-ai/DeepSeek-V3` 已下线或转为付费，全部 403
3. **403 不重试**：原代码对 429 才重试切换模型，遇到 403 直接 throw，没有尝试下一个模型

**已修复（本次）：**
- `.env` 已换新 Key
- `aiService.js` 新增 `fetchWithFallback`，403 和 429 都会自动切换到下一个模型
- 模型列表更换为 `Qwen2.5-7B-Instruct` / `Qwen2.5-14B-Instruct` / `internlm2_5-7b-chat`

**待确认：** 新 Key 下运行 `check-models.js` 确认模型可用后，重新 Fetch Data 补全未分析的新闻。

---

## 已知遗留问题

### BUG-C：Fetch Data 接口阻塞（无进度反馈）
**影响文件：** `backend/routes/news.js`

`POST /api/news/fetch` 在响应前要跑完所有新闻的 AI 分析。100 条新闻 × 500ms = 50 秒以上才有响应，用户只能等待，不知道进度。若文章数量多（300+），极易超时。

**修复方向：** 立即返回 `{ status: 'processing', total: N }`，用轮询接口查进度；或至少加一个超时保护（前 N 条先分析，剩余下次补）。

---

### BUG-D：mock-AAPL.json 为空数组
**影响文件：** `backend/data/mock-AAPL.json`

股价数据第三级 fallback 是本地 mock 文件，但文件内容是 `[]`。答辩时若 Alpha Vantage 和 Stooq 都挂了，股价图会空白。

**修复方法：** 从数据库导出真实数据填入：
```bash
cd backend
node -e "
const db = require('./db/database');
const rows = db.prepare('SELECT date,open,close,high,low FROM stock_prices WHERE symbol=? ORDER BY date').all('AAPL');
require('fs').writeFileSync('data/mock-AAPL.json', JSON.stringify(rows, null, 2));
console.log('Exported', rows.length, 'records');
"
```

---

### BUG-E：AI Insight Report 错误（之前未实现）
**影响文件：** `backend/services/aiService.js`、`backend/routes/sentiment.js`、`frontend/src/components/InsightReport.jsx`

**已修复（本次）：**
- `aiService.js` 新增 `generateText()` 函数
- `sentiment.js` 新增 `POST /api/sentiment/report` 路由
- 新建 `InsightReport.jsx` 组件（Generate Report 按钮 + 报告展示）
- `App.jsx` 在 Analysis 页面接入 InsightReport

---

### WARN-A：240 条新闻 related_symbol = NULL
**影响文件：** 数据库 `news` 表

数据库中存在约 240 条 `related_symbol` 为 NULL 的新闻，所有按 symbol 过滤的查询都不会命中这些数据，但它们已消耗了 AI 分析配额。不影响当前功能，答辩时可忽略。

---

### WARN-B：Alpha Vantage 每日仅 25 次请求
**影响文件：** `backend/services/finnhubService.js`

免费额度极低，多次 Fetch Data 当天就会用完，触发自动降级到 Stooq。Stooq 本身稳定，但偶尔会被封 IP（返回空数据）。建议答辩时提前一天完成数据入库，答辩当天只用已有数据，不再 Fetch。

---

### WARN-C：CLAUDE.md 有过期内容
**影响文件：** `CLAUDE.md`

文档里仍有 Groq 字样，AI 服务已换为 SiliconFlow，需更新。

---

## 修复优先级

| 优先级 | 问题 | 工作量 |
|--------|------|--------|
| P0 | BUG-A：图表断线 / 截断 → 加 `spanGaps: true` | 小（3 个文件各加 1 行） |
| P0 | BUG-B：补全未分析新闻 → 确认新 Key 可用后重跑 Fetch Data | 操作 |
| P1 | BUG-D：填充 mock-AAPL.json | 小（一条命令） |
| P2 | BUG-C：Fetch 接口加超时保护或进度反馈 | 中 |
| P3 | WARN-A / WARN-B / WARN-C | 低 |

---

## 当前文件状态

| 文件 | 状态 | 说明 |
|------|------|------|
| `backend/services/aiService.js` | ✅ 已修 | 新增 `generateText`，403/429 双重重试，模型列表更新 |
| `backend/routes/sentiment.js` | ✅ 已修 | 新增 `/report` 路由 |
| `backend/routes/news.js` | ⚠️ 待优化 | 阻塞式分析，无进度反馈（BUG-C） |
| `backend/.env` | ✅ 已更新 | 换新 SiliconFlow Key |
| `backend/data/mock-AAPL.json` | ❌ 空数组 | 需导出数据（BUG-D） |
| `frontend/src/components/InsightReport.jsx` | ✅ 新建 | AI 报告组件 |
| `frontend/src/components/SentimentChart.jsx` | ❌ 断线 | 缺 `spanGaps`（BUG-A） |
| `frontend/src/components/OverlayChart.jsx` | ❌ 断线 | 缺 `spanGaps`（BUG-A） |
| `frontend/src/components/StockChart.jsx` | ❌ MA 截断 | 缺 `spanGaps`（BUG-A） |
| `frontend/src/App.jsx` | ✅ 已修 | 接入 InsightReport |
