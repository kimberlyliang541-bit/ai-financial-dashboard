# 基于大语言模型的金融新闻情感分析系统——系统设计说明

---

## 一、系统概述

本系统是一个全栈金融数据分析平台，面向个人投资者与研究人员，提供以下核心功能：

1. **新闻采集**：从 Finnhub 金融数据平台抓取指定股票标的的新闻资讯
2. **AI 情感分析**：调用大语言模型（LLM）对新闻标题进行正/负/中性三分类情感打分
3. **股价数据获取**：多来源获取个股历史 OHLC 日线数据
4. **可视化仪表盘**：以图表形式呈现情感趋势、价格走势、情感与价格相关性等多维度分析
5. **AI 分析报告**：基于数据摘要自动生成结构化文字分析报告

---

## 二、整体架构

系统采用经典 **前后端分离** 架构：

```
┌─────────────────────────────────────┐
│           浏览器 (React SPA)         │
│   localhost:5173  (Vite Dev Server) │
└────────────────┬────────────────────┘
                 │ HTTP /api/*（Vite proxy）
┌────────────────▼────────────────────┐
│        Node.js + Express 后端        │
│          localhost:3000             │
│  ┌──────────────────────────────┐   │
│  │       SQLite 数据库           │   │
│  │   news / sentiment_scores    │   │
│  │      / stock_prices          │   │
│  └──────────────────────────────┘   │
└────────────────┬────────────────────┘
                 │ 对外 HTTP 请求（走代理）
    ┌────────────┼────────────┐
    ▼            ▼            ▼
 Finnhub     SiliconFlow   Alpha Vantage
 (新闻)      / DeepSeek    / Stooq
             / 智谱 GLM    (股价)
             (情感 AI)
```

---

## 三、目录结构与模块说明

### 3.1 后端（`backend/`）

```
backend/
├── app.js                        # Express 入口：加载 dotenv、注册路由、启动服务
├── .env                          # 环境变量（API Key、代理地址等，不提交 Git）
├── .env.example                  # 环境变量模板
│
├── db/
│   ├── schema.sql                # 数据库建表 SQL
│   └── database.js               # better-sqlite3 连接 + 自动执行 schema 初始化
│
├── routes/
│   ├── news.js                   # GET /api/news、POST /api/news/fetch
│   ├── sentiment.js              # GET /api/sentiment/trend、/distribution
│   │                             # POST /api/sentiment/analyze、/report
│   └── stocks.js                 # GET /api/stocks/price
│
├── services/
│   ├── finnhubService.js         # 新闻抓取 + 股价三级 Fallback + HTTP 代理封装
│   └── aiService.js              # LLM 五级级联调度引擎
│
└── data/
    └── mock-AAPL.json            # AAPL 本地兜底股价数据（第三级 Fallback）
```

#### 3.1.1 `app.js` — 服务入口

- 第一行执行 `require('dotenv').config()`，确保后续所有模块都能读取 `.env`
- 注册三条路由前缀：`/api/news`、`/api/sentiment`、`/api/stocks`
- 启动 Express 监听，默认端口 3000

#### 3.1.2 `db/database.js` — 数据库层

- 使用 `better-sqlite3` 建立同步连接（区别于 `sqlite3` 的异步回调模式）
- 进程启动时自动读取并执行 `schema.sql`，完成三张表的幂等创建（`CREATE TABLE IF NOT EXISTS`）
- 整个后端共享同一个数据库实例（单例模块）

#### 3.1.3 数据库表结构

| 表名 | 主要字段 | 说明 |
|------|---------|------|
| `news` | `id, headline, summary, source, url, datetime(unix), related_symbol` | 原始新闻记录；`url` 字段设 UNIQUE 约束防重复 |
| `sentiment_scores` | `id, news_id(FK), sentiment, confidence, reason` | AI 分析结果；与 `news` 一对一关联 |
| `stock_prices` | `id, symbol, date, open, close, high, low` | 日线股价；`(symbol, date)` 联合 UNIQUE 防重复 |

#### 3.1.4 `services/finnhubService.js` — 数据采集服务

**新闻抓取** (`fetchNews`)：
- 请求 Finnhub API `/company-news` 端点
- 通过 `fetchWithProxy()` 封装，每次调用时读取 `process.env.HTTPS_PROXY`，在中国大陆环境下自动走 HTTP 代理（使用 `https-proxy-agent` 库）

**股价三级 Fallback** (`fetchCandles`)：

```
第1级：Alpha Vantage API（需 key，25次/天免费）
   ↓ 失败或无 key
第2级：Stooq CSV（完全免费，无需注册，格式：symbol.US）
   ↓ 失败
第3级：本地 mock-AAPL.json（离线兜底，确保答辩可用）
```

#### 3.1.5 `services/aiService.js` — LLM 级联调度引擎

这是本系统的核心技术模块，实现了一套**五级级联 + 健康追踪 + 指数退避**的 AI 调用架构：

**平台优先级：**

| 级别 | 平台 | 模型 | 特点 |
|------|------|------|------|
| 1 | 智谱 GLM | glm-4-flash | 永久免费，无限量，最稳定 |
| 2 | DeepSeek | deepseek-chat | 注册赠 500 万 tokens |
| 3 | SiliconFlow | Qwen2.5-7B/14B、InternLM2.5 | 注册赠 2000 万 tokens，多模型轮询 |
| 4 | （预留扩展位） | — | 可随时插入新平台 |
| 5 | 关键词规则 | — | 零成本，永不失败 |

**可靠性机制：**
- **平台健康追踪**：连续失败 3 次进入冷却期（指数退避：30s → 60s → 120s，上限 5 分钟）
- **模型级 Round-Robin**：同平台多模型轮流请求，分散限流压力
- **15 秒超时 + AbortController**：防止单次请求阻塞整个批处理
- **JSON 解析容错**：用正则从 LLM 输出中提取 JSON，防止模型输出带多余文字
- **最终兜底**：全部 API 失败时，降级为关键词匹配规则（不中断流程）

**两个对外接口：**
- `analyzeSentiment(text)` — 返回 `{ sentiment, confidence, reason }`，**保证有返回值**
- `generateText(prompt)` — 生成自由文本（用于 Insight Report），需要真实 LLM，不做关键词降级

### 3.2 前端（`frontend/src/`）

```
frontend/src/
├── main.jsx                      # React 入口，挂载 <App/>
├── index.css                     # 全局样式：Soft Premium 浅色主题 + 动效
├── theme.js                      # 设计 Token（颜色常量），前端所有组件共用
│
├── App.jsx                       # 根组件：页面路由、数据请求、状态管理
│
└── components/
    ├── ui.jsx                    # 基础 UI 组件：ChartCard、Pill、Badge、SentimentFace
    ├── SummaryCards.jsx          # 三栏指标卡：均值/文章数/趋势
    ├── SentimentChart.jsx        # 情感趋势折线图（Chart.js Line）
    ├── StockChart.jsx            # 股价 OHLC + MA5/MA20 + 高低价带
    ├── OverlayChart.jsx          # 情感 vs 价格叠加图 + Pearson r 显示
    ├── SentimentDistribution.jsx # 正/负/中性占比环形图（Doughnut）
    ├── KeywordChart.jsx          # 高频关键词饼图
    ├── LiveAnalysis.jsx          # 实时情感分析输入框
    └── InsightReport.jsx         # AI 报告生成与展示
```

#### 3.2.1 `App.jsx` — 核心状态与路由

- 维护四类数据状态：`sentimentData`、`priceData`、`newsData`、`distributionData`
- `fetchAll()` 并发请求四个 API（`Promise.allSettled`），单个接口失败不影响其他
- 四个页面（Dashboard / Analysis / Live Test / News）通过数组索引切换，无需路由库
- 包含两类计算函数（纯函数，不含副作用）：
  - `computePearson(sentimentData, priceData)` — 计算 Pearson 相关系数 r
  - `computeTrend(sentimentData)` — 判断情感趋势（rising / declining / stable）

#### 3.2.2 `theme.js` — 设计 Token

系统采用 **Soft Premium** 设计体系，所有颜色通过此文件统一管理，避免魔法数字散落各处：

```js
C.bg           // 页面底色 #F6F7FB（柔灰白）
C.surface      // 卡片背景 rgba(255,255,255,0.85)（毛玻璃白）
C.accent       // 主交互色 #6366F1（靛蓝）
C.gradientPrimary  // 渐变 #A7BFFF → #E0E7FF
C.sky          // 暖橘点缀 #F59E8B
C.pos / C.red  // 正面/负面情感专用色
C.text / C.textMid / C.textDim  // 三级文字层次
```

---

## 四、核心业务流程

### 4.1 数据采集与分析流程（Fetch Data）

这是系统最核心的数据写入路径：

```
用户点击「Fetch Data」
        │
        ▼
POST /api/news/fetch  { symbol, from, to }
        │
        ├─① fetchNews(symbol, from, to)
        │      └─ Finnhub API（经代理）→ 返回文章数组
        │
        ├─② DB 事务：INSERT OR IGNORE INTO news
        │      （url UNIQUE 约束自动去重）
        │
        ├─③ 查询未打分文章（LEFT JOIN sentiment_scores WHERE s.id IS NULL）
        │      └─ 串行调用 analyzeSentiment(headline)
        │              ├─ 尝试智谱 GLM-4-Flash
        │              ├─ 失败 → DeepSeek
        │              ├─ 失败 → SiliconFlow（多模型轮询）
        │              └─ 全失败 → 关键词规则兜底
        │
        ├─④ DB：INSERT INTO sentiment_scores
        │
        ├─⑤ fetchCandles(symbol, from, to)
        │      ├─ Alpha Vantage
        │      ├─ Stooq CSV
        │      └─ 本地 Mock JSON
        │
        └─⑥ DB 事务：INSERT OR IGNORE INTO stock_prices
              │
              ▼
        响应 { inserted, scored, pricesInserted }
```

### 4.2 数据查询与可视化流程

```
用户点击「Apply」（或切换 symbol）
        │
        ▼
fetchAll(symbol, from, to)  — Promise.allSettled 并发
        ├─ GET /api/sentiment/trend     → sentimentData[]
        ├─ GET /api/stocks/price        → priceData[]
        ├─ GET /api/news                → newsData[]
        └─ GET /api/sentiment/distribution → { positive, negative, neutral }
                │
                ▼
        React 状态更新 → 各图表组件重渲染
        ├─ SentimentChart    ← sentimentData
        ├─ StockChart        ← priceData
        ├─ OverlayChart      ← sentimentData + priceData（+计算 Pearson r）
        ├─ SentimentDistribution ← distributionData
        └─ KeywordChart      ← newsData[].headline（前端词频统计）
```

### 4.3 实时情感分析流程（Live Test 页）

```
用户输入文本 → 点击「Analyze」
        │
        ▼
POST /api/sentiment/analyze  { text }
        │
        └─ 直接调用 analyzeSentiment(text)
                │
                ▼
        返回 { sentiment, confidence, reason }
        前端展示结果（含情感图标 + 置信度进度条）
```

### 4.4 AI Insight Report 生成流程（Analysis 页）

```
用户点击「Generate Report」
        │
        ▼
POST /api/sentiment/report
  { symbol, from, to, sentimentSummary, priceSummary, distribution, pearsonR }
        │
        └─ 构建分析 Prompt（含情感数据摘要 + 价格数据摘要 + Pearson r）
                │
                ▼
        generateText(prompt)  → LLM 级联（不做关键词降级）
                │
                ▼
        返回三段结构化文字报告：
        ① Sentiment Trend（情感趋势描述）
        ② Correlation Finding（Pearson r 解读）
        ③ Outlook（短期情感展望）
```

---

## 五、技术选型理由

### 5.1 前端：React 18 + Vite

**选用理由：**

- **React**：组件化开发模型适合仪表盘类应用——每个图表、每个指标卡都是独立组件，状态与视图解耦，便于维护。Hooks（`useState`、`useEffect`）简化了数据加载和组件生命周期管理。
- **Vite**：相比 Create React App，Vite 基于原生 ES Module，冷启动速度提升 10 倍以上，热更新几乎即时，显著改善开发体验。内置 `/api` 代理配置，彻底解决开发阶段跨域问题，无需后端额外配置 CORS。
- **无状态管理库**：项目数据流向单一（全部从 `App.jsx` 向下传递），不存在跨层级共享状态，引入 Redux/Zustand 只会增加代码复杂度，故使用 React 原生 Context 机制已足够。

### 5.2 图表：Chart.js

**选用理由：**

- 轻量（相比 ECharts 体积小 50% 以上），对折线图、饼图、环形图等金融常用图表支持完善
- 与 React 结合方式成熟（通过 `useRef` 直接管理 Canvas 实例），无需额外的 React 封装库
- 支持图表数据动态更新（`chart.update()`），适合实时场景

### 5.3 后端：Node.js + Express

**选用理由：**

- **JavaScript 全栈统一**：前后端使用同一语言，降低上下文切换成本，JSON 数据格式天然契合
- **Express 轻量灵活**：无需 Spring Boot 级别的大型框架，三条路由对应三类数据资源，结构清晰
- **异步 I/O 天然适配**：系统大量操作为网络请求（Finnhub、AI API、Stooq），Node.js 事件循环模型能高效处理并发 I/O，不阻塞进程

### 5.4 数据库：SQLite（better-sqlite3）

**选用理由：**

- **零配置部署**：数据库即一个文件（`sentiment.db`），无需安装数据库服务，适合单机毕设环境和演示答辩
- **better-sqlite3 同步 API**：相比 `sqlite3` 的异步回调，同步操作大幅简化批量写入逻辑（在事务中循环插入数百条新闻无需 Promise 链）
- **数据量级匹配**：单一股票标的、30-90 天范围的新闻量通常在 500-2000 条，SQLite 处理此量级游刃有余，不需要 MySQL/PostgreSQL

### 5.5 AI 情感分析：多平台 LLM 级联架构

**问题背景：**
金融新闻情感分析需要模型具备金融语境理解能力，传统基于词袋的 VADER 等工具对"Apple 下调 iPhone 产能预期"此类复合语义的判断准确率较低。使用 LLM 可显著提升语义理解深度。

**选用理由：**

| 方案 | 优势 | 劣势 |
|------|------|------|
| 单一 API（如 OpenAI） | 简单 | 国内访问受限；费用高；配额耗尽即中断 |
| 本地部署模型（Ollama） | 隐私 | 需要 GPU；本地环境难以保障；速度慢 |
| **多平台级联**（本方案） | 高可用；免费额度覆盖完整演示；某平台宕机自动切换 | 代码复杂度略高 |

**具体平台选择逻辑：**
- 智谱 GLM-4-Flash：**永久免费**，国内直连，作为主力平台
- DeepSeek：国内访问稳定，赠送额度足够批量处理
- SiliconFlow：提供 Qwen、InternLM 等多个开源模型，可轮询降低单模型限速影响
- 关键词规则作为最终兜底：确保系统在**任何网络条件下**都能给出情感判断，不中断流程

### 5.6 新闻数据源：Finnhub

**选用理由：**
- 免费套餐提供股票相关新闻，支持按 symbol + 时间范围查询
- 覆盖主流美股标的（AAPL、TSLA、NVDA 等），满足毕设演示需求
- 注：国内需配置 HTTP 代理访问（本系统已在 `finnhubService.js` 中实现自动代理注入）

### 5.7 股价数据：三级 Fallback 策略

**设计动机：**
单一数据源存在配额限制（Alpha Vantage 25次/天）和网络可达性问题，三级 Fallback 确保答辩现场股价数据始终可用：

```
Alpha Vantage（最全，25次/天）
    → Stooq（免费，无限量，无需 Key）
        → 本地 Mock JSON（完全离线，答辩兜底）
```

---

## 六、关键算法说明

### 6.1 Pearson 相关系数计算

系统在前端实时计算情感数据与股价数据的 Pearson 相关系数 r，用于量化"新闻情感与股价走势的相关程度"：

$$r = \frac{n\sum x_i y_i - \sum x_i \sum y_i}{\sqrt{(n\sum x_i^2 - (\sum x_i)^2)(n\sum y_i^2 - (\sum y_i)^2)}}$$

- **x**：每日平均情感得分（-1 到 +1）
- **y**：股价收盘价（归一化到 -1 到 +1，消除量纲差异）
- **解读标准**：|r| > 0.7 为强相关，0.4~0.7 为中等相关，< 0.4 为弱相关

### 6.2 情感趋势判断

将时间序列等分为前后两段，比较均值：

```
前半段均值 a，后半段均值 b
if b - a > 0.1  → rising（情感向好）
if a - b > 0.1  → declining（情感转差）
else            → stable（情感平稳）
```

---

## 七、非功能性设计

### 7.1 可用性

- API 请求使用 `Promise.allSettled`，单接口失败不影响其他数据展示
- AI 分析全程有关键词兜底，不存在"全部失败"的情况
- 股价数据三级 Fallback，答辩环境零依赖

### 7.2 网络适配（国内环境）

- `finnhubService.js` 的 `fetchWithProxy()` 自动读取 `HTTPS_PROXY` 环境变量
- 仅需在 `.env` 中添加一行即可启用代理，无需修改代码

### 7.3 数据去重

- 新闻表 `url` 字段 UNIQUE + `INSERT OR IGNORE`：重复抓取同一新闻自动跳过
- 股价表 `(symbol, date)` 联合 UNIQUE：重复写入同一天数据自动跳过
