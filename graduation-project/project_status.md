# Project Status — Code Audit
> 最后更新：2026-03-19 | 基于 commit `6b77bd5` + 本次修复

---
## ✅ 当前代码已可运行

**分支：** `feat/initial-logic-wip`（WIP，勿合并到 main）

### 已知 Bug（未修复）
无阻断性 Bug。

### 本次已修复（2026-03-19）
| 修复 | 位置 |
|------|------|
| `node-sqlite3-wasm` → `better-sqlite3`（WASM 不支持 `DEFAULT (datetime('now'))`，启动崩溃）| `db/database.js`, `package.json` |
| `fetchCandles` 切换 Alpha Vantage（Finnhub 付费端点 403）| `services/finnhubService.js` |
| fetchCandles 失败改为非致命（warn + 返回空数组）| `routes/news.js` |
| `db.transaction(async)` 拆分为三步同步事务（BUG-01）| `routes/news.js` |
| `news.url` 加 `UNIQUE` 约束，`INSERT OR IGNORE` 现在生效（BUG-02）| `db/schema.sql` |
| `JSON.parse` 加 try/catch，Groq 返回非 JSON 时降级而非崩溃（WARN-01）| `services/aiService.js` |
| `fetchAll` 加 `catch`，前端显示错误提示（WARN-02）| `frontend/src/App.jsx` |
| 归一化范围 `[0,1]` → `[-1,1]`（与 Y 轴对齐，NOTE-01）| `components/OverlayChart.jsx` |

### 待办
- 注册 Alpha Vantage 免费 Key（https://www.alphavantage.co/support/#api-key），填入 `backend/.env` 的 `ALPHA_VANTAGE_API_KEY`（stock price 图表需要此 key）

---

---

## 总体评估

脚手架结构完整，数据流逻辑清晰，可以作为开发起点。但有 **2 个严重 Bug** 需要在第一次真实运行前修复，否则 M1 数据入库会出现重复数据或事务失效。

---

## 严重问题（必须修复，否则功能不正确）

### BUG-01：`db.transaction()` 不支持 async 函数
**文件：** `backend/routes/news.js:50`

```js
// 当前错误写法
const runBatch = db.transaction(async () => { ... });
await runBatch();
```

`better-sqlite3` 的事务是**同步**的，传入 async 函数后，事务会在第一个 `await` 处立即提交，后续的 AI 分析和数据插入在事务外执行。实际效果等于没有事务保护。

**修复方向：** 将 AI 分析移到事务外，先批量插入新闻（同步事务），再逐条调用 Groq（异步），最后批量插入情绪分数（同步事务）。

---

### BUG-02：`news` 表没有 UNIQUE 约束，`INSERT OR IGNORE` 失效
**文件：** `backend/db/schema.sql` + `backend/routes/news.js:40`

```sql
-- schema.sql 中 news 表没有任何 UNIQUE 列
-- 所以 INSERT OR IGNORE 不会忽略任何行
INSERT OR IGNORE INTO news (...) VALUES (...)
```

每次调用 `POST /api/news/fetch` 都会把相同新闻重复写入，数据库会持续膨胀，情绪分析也会被重复调用（消耗 Groq 配额）。

**修复方向：** 在 `schema.sql` 中给 `news` 表加唯一约束，推荐用 `url` 字段（Finnhub 每条新闻 url 唯一）：

```sql
url TEXT UNIQUE,
```

---

## 中等问题（影响可靠性，建议修复）

### WARN-01：`JSON.parse()` 可能崩溃
**文件：** `backend/services/aiService.js:40`

```js
return JSON.parse(raw);  // 若 Groq 返回非 JSON 文本，直接抛异常
```

Groq 在限流或网络抖动时偶尔返回错误文本而非 JSON，会导致整个 `/analyze` 接口返回 500。

**修复方向：** 包一层 try/catch，解析失败时返回 `{ sentiment: 'neutral', confidence: 0, reason: 'Parse error' }`。

---

### WARN-02：前端 `fetchAll` 无 catch，错误静默失败
**文件：** `frontend/src/App.jsx:29`

```js
async function fetchAll(sym, f, t) {
  setLoading(true);
  try {
    const [...] = await Promise.all([...]);
    // ...
  } finally {
    setLoading(false);
  }
  // 没有 catch：网络错误时页面无任何提示
}
```

后端挂掉时，`loading` 消失但图表空白，用户不知道发生了什么。

**修复方向：** 加 `catch(e)` 并设置一个 `error` state 展示给用户。

---

## 轻微问题（不影响功能，优化体验）

### NOTE-01：叠加图股价归一化到 [0, 1]，但 Y 轴范围是 [-1, 1]
**文件：** `frontend/src/components/OverlayChart.jsx`

`normalize()` 函数输出范围 `[0, 1]`，股价曲线只会出现在图表的上半部分，而情绪线占满整个 `[-1, 1]` 范围。视觉上两条线对比不够直观。

**修复方向：** 将归一化范围改为 `[-1, 1]`（min-max 线性映射）。

---

### NOTE-02：`inserted` 计数器包含情绪分析失败的条目
**文件：** `backend/routes/news.js:68-70`

情绪分析失败时，`inserted++` 仍然执行，返回的 `inserted` 数值比实际成功写入情绪分数的条数多。语义上略有误导，但不影响数据正确性（新闻条目本身已写入）。

---

## 未实现 / 缺失内容

| 项目 | 说明 |
|------|------|
| 独立数据拉取脚本 | M1 完成标志要求"运行脚本"，目前只有 API 接口触发入库，需要 `scripts/seed.js` |
| `frontend/.env.example` | `VITE_API_URL` 没有示例文件，新人配置时容易遗漏 |
| `README.md` | 项目根目录缺少启动说明 |

---

## 文件状态速览

| 文件 | 状态 | 备注 |
|------|------|------|
| `backend/db/schema.sql` | ✅ 已修 | url 加 UNIQUE 约束 |
| `backend/db/database.js` | ✅ 正常 | |
| `backend/services/finnhubService.js` | ✅ 正常 | |
| `backend/services/aiService.js` | ✅ 已修 | JSON.parse 加 try/catch |
| `backend/routes/news.js` | ✅ 已修 | 拆分为三步，移除 async 事务 |
| `backend/routes/sentiment.js` | ✅ 正常 | |
| `backend/routes/stocks.js` | ✅ 正常 | |
| `backend/app.js` | ✅ 正常 | |
| `frontend/src/App.jsx` | ✅ 已修 | 加了 catch + error state |
| `frontend/src/components/SentimentChart.jsx` | ✅ 正常 | |
| `frontend/src/components/StockChart.jsx` | ✅ 正常 | |
| `frontend/src/components/OverlayChart.jsx` | ✅ 已修 | 归一化范围 [-1,1] |
| `frontend/src/components/KeywordChart.jsx` | ✅ 正常 | |
| `frontend/src/components/LiveAnalysis.jsx` | ✅ 正常 | |

---

## 建议修复优先级

```
P0（运行前必须）：BUG-01, BUG-02
P1（联调前建议）：WARN-01, WARN-02
P2（答辩前优化）：NOTE-01
P3（时间充裕再做）：NOTE-02, 缺失文件
```
