# Project Spec — AI Financial News Sentiment Dashboard

---

# 第一部分：产品需求 PRD (Product Requirements)

## 1. 项目目标与愿景 Goals & Vision

### 问题陈述
每个交易日产生数百条财经新闻，投资者需要花大量时间阅读才能判断市场整体情绪。人工处理不仅耗时，还容易遗漏关键信息，导致决策滞后。

### 解决方案
构建一个 AI 驱动的财经新闻情绪分析仪表盘，自动抓取英文财经新闻，通过大语言模型 API 进行情绪分析，并将结果以交互式图表的形式可视化展示，帮助用户在 30 秒内判断特定股票的市场情绪走向。

### 目标用户
- 个人投资者：希望快速了解某只股票的新闻情绪，辅助短期交易决策
- 金融学术研究者：研究新闻情绪与股价波动的相关性
- 本项目答辩评委：评估系统的完整性、AI 集成能力和可视化效果

### 一句话定位
> "一个全栈 AI 应用，通过接入大语言模型 API 对财经新闻进行情绪分析，并将分析结果与股市走势进行可视化对比。"

---

## 2. 核心功能列表 Features (MVP)

### 必须有（MVP）

**F1 — 新闻数据展示**
用户可以在仪表盘上查看按股票代码筛选的财经新闻列表，每条新闻包含标题、来源、发布时间和 AI 情绪标签。

**F2 — 情绪趋势图**
用户可以查看指定股票在选定日期范围内的每日平均情绪分数折线图，分数范围 -1（极负面）到 +1（极正面）。

**F3 — 股价走势图**
用户可以查看指定股票在相同日期范围内的每日收盘价折线图，与情绪图放置在同一视图中便于对比。

**F4 — 情绪 vs 股价叠加图**
用户可以在同一张图表中同时查看情绪趋势线和股价走势线（股价归一化处理），直观呈现两者的相关性。

**F5 — 关键词分布图**
用户可以查看指定时间段内财经新闻中出现频率最高的财经词汇饼图，了解市场关注热点。

**F6 — 日期和股票筛选器**
用户可以通过日期范围选择器和股票代码输入框（如 AAPL、TSLA）动态筛选所有图表的展示数据。

**F7 — 实时情绪分析输入框**
用户可以在输入框中输入任意一段英文财经新闻文字，点击"分析"按钮后，系统在 3 秒内返回 AI 情绪分析结果，包含情绪标签（正面/负面/中性）、置信度百分比和一句话分析理由。

### 不做（Future Work）
- 情绪超过阈值时的实时提醒推送
- 中文新闻支持
- 图表导出为 PNG / 数据导出为 CSV
- 50 用户并发支持
- 自行训练情绪分析模型
- 同时接入 3 个以上新闻数据源

---

## 3. 用户流程与交互 User Flows

### 主流程：查看历史情绪分析
```
用户打开仪表盘首页
  → 默认展示 AAPL 最近 30 天数据
  → 页面顶部显示股票代码筛选器 + 日期范围选择器
  → 用户修改股票代码为 TSLA，日期改为近 7 天
  → 四个图表同步刷新，展示 TSLA 对应数据
  → 用户鼠标悬停在情绪趋势图某个数据点
  → Tooltip 显示该日期的具体情绪分数和新闻条数
```

### 副流程：实时情绪分析（答辩演示核心）
```
用户看到页面底部的"实时分析"模块
  → 在输入框中输入一条新闻标题
    示例："Federal Reserve raises interest rates by 0.5%, markets tumble"
  → 点击"分析"按钮
  → 按钮变为 loading 状态（防止重复提交）
  → 2-3 秒后结果区域显示：
      [负面] 置信度 92% · "提到加息和市场下跌，情绪明显偏空"
  → 用户可以清空输入框，输入新内容重新分析
```

---

## 4. 开发里程碑 Milestones

### M1 — 数据底座（预计 3~5 天）
**目标：** 系统能从 Finnhub 拉取财经新闻和股价数据并存入 SQLite 数据库。

完成标志：运行数据拉取脚本后，数据库三张表中均有数据，可通过 SQL 查询验证。

### M2 — AI 分析层（预计 3~5 天）
**目标：** 系统能对数据库中的每条新闻调用 Groq API 进行情绪分析，并将结果存回数据库。

完成标志：传入任意新闻标题字符串，能返回包含 `sentiment`、`confidence`、`reason` 字段的 JSON 结果。

### M3 — 历史数据仪表盘（预计 1~2 周）
**目标：** React 前端展示四个交互式图表，支持股票代码和日期范围筛选。

完成标志：打开浏览器，修改筛选条件后所有图表同步更新，数据来自后端真实接口。

### M4 — 实时分析输入框（预计 2~3 天）
**目标：** 仪表盘底部的实时分析模块可用，输入文字后能在页面上展示 AI 分析结果。

完成标志：输入任意英文文字，点击分析，3 秒内页面显示情绪标签、置信度、理由。

---

# 第二部分：工程设计 EDD (Engineering Design)

## 1. 技术栈 Tech Stack

| 层级 | 技术 | 用途 |
|---|---|---|
| 前端框架 | React 18 | 组件化 UI 开发 |
| 图表库 | Chart.js + react-chartjs-2 | 折线图、饼图渲染 |
| 前端样式 | CSS Modules / Bootstrap | 响应式布局 |
| 后端框架 | Node.js + Express | REST API 服务 |
| 数据库 | SQLite3 | 本地文件型数据库，零配置 |
| ORM | better-sqlite3 | Node.js 操作 SQLite |
| 新闻+股价数据 | Finnhub API（免费版） | 财经新闻和每日股价 |
| AI 情绪分析 | Groq API（免费版，LLaMA3） | 大模型情绪分析，备选 Gemini API |
| 环境变量 | dotenv | 管理 API Key，避免硬编码 |
| 版本控制 | Git | 代码托管和版本管理 |
| 开发工具 | VS Code + Postman | 开发环境和接口测试 |

---

## 2. 数据模型 Data Schema

### 表1：news（新闻原文）
```sql
CREATE TABLE IF NOT EXISTS news (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  headline        TEXT    NOT NULL,
  summary         TEXT,
  source          TEXT,
  url             TEXT,
  datetime        INTEGER,          -- Unix 时间戳
  related_symbol  TEXT,             -- 关联股票代码，如 'AAPL'
  created_at      TEXT DEFAULT (datetime('now'))
);
```

### 表2：sentiment_scores（AI 分析结果）
```sql
CREATE TABLE IF NOT EXISTS sentiment_scores (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id      INTEGER NOT NULL,
  sentiment    TEXT    NOT NULL,    -- 'positive' | 'negative' | 'neutral'
  confidence   REAL    NOT NULL,    -- 0.0 到 1.0
  reason       TEXT,                -- AI 一句话理由
  analyzed_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (news_id) REFERENCES news(id)
);
```

### 表3：stock_prices（每日股价）
```sql
CREATE TABLE IF NOT EXISTS stock_prices (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol  TEXT    NOT NULL,         -- 股票代码，如 'AAPL'
  date    TEXT    NOT NULL,         -- 格式 'YYYY-MM-DD'
  open    REAL,
  close   REAL,
  high    REAL,
  low     REAL,
  UNIQUE(symbol, date)              -- 防止重复插入
);
```

### 表关系说明
```
news (1) ──→ (1) sentiment_scores   通过 news_id 关联
stock_prices                         独立存储，按 symbol + date 查询
前端叠加图：按 date 字段对齐 sentiment_scores 和 stock_prices
```

---

## 3. API 接口设计 API Routes

### 新闻相关

**GET /api/news**
获取新闻列表（含情绪分析结果）

| 参数 | 类型 | 说明 |
|---|---|---|
| symbol | string | 股票代码，如 AAPL |
| from | string | 开始日期 YYYY-MM-DD |
| to | string | 结束日期 YYYY-MM-DD |

返回示例：
```json
[
  {
    "id": 1,
    "headline": "Apple reports record Q1 earnings",
    "source": "Reuters",
    "datetime": 1710000000,
    "related_symbol": "AAPL",
    "sentiment": "positive",
    "confidence": 0.89,
    "reason": "Record earnings signal strong financial health"
  }
]
```

**POST /api/news/fetch**
触发从 Finnhub 拉取新闻并存库（内部维护用，不暴露给前端）

| 参数 | 类型 | 说明 |
|---|---|---|
| symbol | string | 股票代码 |
| from | string | 开始日期 |
| to | string | 结束日期 |

---

### 情绪分析相关

**GET /api/sentiment/trend**
获取每日聚合情绪数据，供趋势图使用

| 参数 | 类型 | 说明 |
|---|---|---|
| symbol | string | 股票代码 |
| from | string | 开始日期 |
| to | string | 结束日期 |

返回示例：
```json
[
  { "date": "2026-03-15", "avgScore": -0.42, "count": 8 },
  { "date": "2026-03-16", "avgScore": 0.21,  "count": 12 },
  { "date": "2026-03-17", "avgScore": 0.65,  "count": 6 }
]
```

**POST /api/sentiment/analyze**
实时分析任意文字，供 M4 输入框使用

请求体：
```json
{ "text": "Fed raises interest rates by 0.5%, markets tumble" }
```

返回示例：
```json
{
  "sentiment": "negative",
  "confidence": 0.92,
  "reason": "Mentions rate hike and market decline, bearish signal"
}
```

---

### 股价相关

**GET /api/stocks/price**
获取每日股价数据，供股价图和叠加图使用

| 参数 | 类型 | 说明 |
|---|---|---|
| symbol | string | 股票代码 |
| from | string | 开始日期 |
| to | string | 结束日期 |

返回示例：
```json
[
  { "date": "2026-03-15", "open": 172.3, "close": 169.8, "high": 173.1, "low": 168.9 },
  { "date": "2026-03-16", "open": 170.2, "close": 174.5, "high": 175.0, "low": 169.5 }
]
```

---

## 4. 系统架构与数据流 Architecture & Data Flow

### 系统架构

```
┌─────────────────────────────────────────┐
│              React 前端                  │
│  SentimentChart  StockChart  Overlay    │
│  KeywordChart    LiveAnalysis           │
└──────────────┬──────────────────────────┘
               │ HTTP REST API
┌──────────────▼──────────────────────────┐
│           Node.js + Express 后端         │
│  routes/news.js   routes/sentiment.js   │
│  routes/stocks.js                       │
│  services/finnhubService.js             │
│  services/aiService.js                  │
└──────┬────────────────────┬─────────────┘
       │                    │
┌──────▼──────┐    ┌────────▼──────────────┐
│   SQLite    │    │    外部 API            │
│  news       │    │  Finnhub（新闻+股价）  │
│  sentiment  │    │  Groq（情绪分析）      │
│  stock_price│    └───────────────────────┘
└─────────────┘
```

### 数据流：历史数据展示
```
1. 用户在前端选择股票代码 + 日期范围
2. 前端同时发出三个请求：
     GET /api/sentiment/trend
     GET /api/stocks/price
     GET /api/news
3. 后端查询 SQLite，返回结果
4. 前端用 Chart.js 渲染四个图表
```

### 数据流：实时情绪分析（M4）
```
1. 用户在输入框输入新闻文字，点击"分析"
2. 前端发送 POST /api/sentiment/analyze
3. 后端 aiService.js 调用 Groq API
4. Groq 返回 { sentiment, confidence, reason }
5. 后端将结果返回前端
6. 前端渲染情绪标签、置信度、理由
```

### 数据流：数据入库（定期维护）
```
1. 手动调用 POST /api/news/fetch
2. finnhubService.js 调用 Finnhub /company-news 接口
3. 新闻存入 news 表
4. aiService.js 批量对每条新闻调用 Groq API
5. 情绪结果存入 sentiment_scores 表
6. finnhubService.js 调用 Finnhub /stock/candle 接口
7. 股价数据存入 stock_prices 表
```

---

## 5. 项目文件结构 Project Structure

```
graduation-project/
│
├── backend/
│   ├── db/
│   │   ├── database.js          # SQLite 连接初始化
│   │   └── schema.sql           # 建表语句
│   ├── routes/
│   │   ├── news.js              # GET /api/news, POST /api/news/fetch
│   │   ├── sentiment.js         # GET /api/sentiment/trend, POST /api/sentiment/analyze
│   │   └── stocks.js            # GET /api/stocks/price
│   ├── services/
│   │   ├── finnhubService.js    # 封装 Finnhub API 调用
│   │   └── aiService.js         # 封装 Groq API 调用
│   ├── .env                     # API Keys（不上传 Git）
│   ├── app.js                   # Express 入口
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SentimentChart.jsx   # 情绪趋势折线图
│   │   │   ├── StockChart.jsx       # 股价走势折线图
│   │   │   ├── OverlayChart.jsx     # 情绪+股价叠加图
│   │   │   ├── KeywordChart.jsx     # 关键词饼图
│   │   │   └── LiveAnalysis.jsx     # 实时分析输入框（M4）
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── .gitignore                   # 排除 .env, node_modules
└── README.md
```

---

## 6. 环境变量 Environment Variables

`.env` 文件（存放于 `backend/` 目录，不上传 Git）：

```
FINNHUB_API_KEY=your_finnhub_key_here
GROQ_API_KEY=your_groq_key_here
PORT=3000
```

---

*根据毕业设计项目规划对话整理 · 2026年3月*
