> ⚠️ 此为早期规划草稿，最新方案见 problem.md，实施已完成。

# 开发规划：图表修复 + 数据增强

## Context

当前项目是一个财务新闻情感分析仪表板（毕业设计）。现有的 `fix/db-setup-and-bugfixes` 分支已完成初期 Bug 修复，但运行时存在两个明显问题：

1. **很多图加载不出来** — 原因是 Yahoo Finance 股价 API 在国内 IP 环境下不稳定（被反爬/阻断），`fetchCandles()` 静默返回空数组，导致 StockChart（股价线图）和 OverlayChart（叠加对比图）都显示 "No data" placeholder。SentimentChart 和 KeywordChart 也可能为空（数据库初始为空，未 Fetch Data）。

2. **股价对比图看起来很单薄** — 只有收盘价一条线，没有 K 线/成交量/均线，且数据点少（假日空缺造成锯齿感）。

---

## 根本原因诊断

| 症状 | 原因 | 文件 |
|------|------|------|
| StockChart / OverlayChart 空白 | Yahoo Finance `query1.finance.yahoo.com` 反爬，返回 403/空 | `backend/services/finnhubService.js` fetchCandles() |
| SentimentChart 空白 | 数据库为空（首次使用，未点 Fetch Data） | 预期行为，但 UX 引导不足 |
| 股价图数据单薄 | 只展示收盘价一条线，无 K 线/成交量/均线 | `frontend/src/components/StockChart.jsx` |
| CLAUDE.md 信息过期 | 仍写 Groq API，实际已换 SiliconFlow | `CLAUDE.md` |

---

## 开发方向规划

### 阶段一：修复股价数据源（P0，核心阻断问题）

**目标：** 让股价图稳定有数据

**方案：** Yahoo Finance 主源 + Stooq 免费备用源双 fallback

- **主源：** 切换 Yahoo Finance 到 `query2.finance.yahoo.com`（更少反爬），加更完整的 Headers（`Accept`、`Accept-Language` 等）
- **备用源：** [Stooq](https://stooq.com) 免费 CSV API（无需 key）：
  `https://stooq.com/q/d/l/?s=AAPL.US&d1=20260101&d2=20260320&i=d`
- 失败时顺序降级，两个源都失败才返回空数组
- 修改文件：`backend/services/finnhubService.js`

---

### 阶段二：丰富股价图表（P1，直接解决"图看起来单薄"）

**目标：** StockChart 从单线图变为信息密度更高的专业图表

**改动：**
1. **StockChart.jsx** — 增加 MA5 / MA20 移动均线（在前端计算，不需要后端改动）
2. **StockChart.jsx** — 利用已有的 `open/high/low/close` 数据，增加 high-low band（每日波动范围）
3. **OverlayChart.jsx** — 当某条线数据为空时，显示明确提示（哪条线缺失）

---

### 阶段三：改善首次使用 UX（P1）

**目标：** 消除"数据库为空时所有图都空白"的困惑感

**改动：**
- `App.jsx` — 三个数据集都为空时，显示醒目引导横幅
- 区分两种空状态：① 数据库为空（从未 fetch）② 当前筛选条件无结果

---

### 阶段四：新增情感分布图（P2，增加答辩亮点）

**目标：** 增加情感分布 Doughnut Chart，展示正/负/中性新闻比例

**改动：**
- 新增 `SentimentDistribution.jsx` 组件（Doughnut Chart）
- 后端 `sentiment.js` 新增 `GET /api/sentiment/distribution` 接口
- `App.jsx` 增加该组件

---

### 阶段五：更新文档（P3）

- 更新 `CLAUDE.md`：Groq → SiliconFlow，Alpha Vantage → Yahoo Finance + Stooq
- 更新 `project_status.md`

---

## 关键文件路径

| 文件 | 改动 |
|------|------|
| `backend/services/finnhubService.js` | 修复 fetchCandles()：双源 fallback |
| `frontend/src/components/StockChart.jsx` | 增加 MA5/MA20，high-low band |
| `frontend/src/components/OverlayChart.jsx` | 改善单数据集时的状态提示 |
| `frontend/src/App.jsx` | 空状态引导横幅，新增 distribution 数据获取 |
| `backend/routes/sentiment.js` | 新增 GET /api/sentiment/distribution |
| `frontend/src/components/SentimentDistribution.jsx` | 新增文件，Doughnut 图 |
| `CLAUDE.md` | 文档更新 |

---

## 验证方法

1. 启动 `backend/` 和 `frontend/`
2. 不点 Fetch Data → 验证引导横幅是否显示
3. 点 Fetch Data（AAPL，30天范围）→ 验证图表全部有数据
4. 验证 StockChart 显示 MA 均线
5. 关闭网络或让 Yahoo Finance 失败 → 验证 Stooq fallback 生效（后端日志确认）
6. 验证 SentimentDistribution 饼图显示正/负/中性比例
