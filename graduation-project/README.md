# AI Financial News Sentiment Dashboard

A graduation project that fetches financial news, analyzes sentiment with AI, and visualizes the results alongside stock price data.

**Stack:** React 18 + Chart.js · Node.js + Express · SQLite · Finnhub · SiliconFlow (Qwen2.5) · Alpha Vantage / Stooq

---

## Quick Start

### 1. API Keys

You need three API keys. All have free tiers:

| Key | Where to get | Required? |
|-----|-------------|-----------|
| `FINNHUB_API_KEY` | https://finnhub.io (free) | Yes — news data |
| `SILICONFLOW_API_KEY` | https://siliconflow.cn (free) | Yes — AI sentiment |
| `ALPHA_VANTAGE_API_KEY` | https://www.alphavantage.co/support/#api-key (free) | Optional — stock prices (25 req/day) |

Stock prices fall back to Stooq (free, no key) if Alpha Vantage is unavailable.

Edit `backend/.env`:

```env
FINNHUB_API_KEY=your_key
SILICONFLOW_API_KEY=your_key
ALPHA_VANTAGE_API_KEY=your_key
PORT=3000
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Start the servers

Open two terminals:

```bash
# Terminal 1 — backend (port 3000)
cd graduation-project/backend
npm run dev

# Terminal 2 — frontend (port 5173)
cd graduation-project/frontend
npm run dev
```

Open **http://localhost:5173**

### 4. Load data

**Option A — via the UI (recommended)**

Click the green **Fetch Data** button in the dashboard. It will pull news from Finnhub, run SiliconFlow sentiment analysis on each headline, and fetch stock prices. This takes 1–3 minutes depending on the number of articles.

**Option B — via CLI seed script**

```bash
cd backend
node scripts/seed.js AAPL 2026-02-01 2026-03-19
```

---

## Features

| Feature | Description |
|---------|-------------|
| News ingestion | Fetches company news from Finnhub for any ticker + date range |
| AI Sentiment | Classifies each headline as positive / neutral / negative via SiliconFlow (Qwen2.5) |
| Daily Sentiment Chart | Line chart of average daily sentiment score |
| Stock Price Chart | Close price + MA5/MA20 + High-Low band (Alpha Vantage → Stooq fallback) |
| Overlay Chart | Sentiment vs. normalized stock price + Pearson correlation coefficient |
| Sentiment Distribution | Doughnut chart of positive / negative / neutral ratios |
| Keyword Chart | Pie chart of top keywords extracted from headlines |
| Live Analysis | Real-time sentiment analysis for any text you paste |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/news` | News list with sentiment scores |
| POST | `/api/news/fetch` | Trigger data ingestion + AI analysis |
| GET | `/api/sentiment/trend` | Daily average sentiment scores |
| GET | `/api/sentiment/distribution` | Positive / negative / neutral counts |
| POST | `/api/sentiment/analyze` | Analyze arbitrary text in real time |
| GET | `/api/stocks/price` | Historical OHLC stock prices |
| GET | `/health` | Health check |

---

## Project Structure

```
graduation-project/
├── backend/
│   ├── app.js              # Express entry point (port 3000)
│   ├── db/
│   │   ├── schema.sql      # SQLite schema
│   │   └── database.js     # DB connection
│   ├── routes/             # news.js · sentiment.js · stocks.js
│   ├── services/           # finnhubService.js · aiService.js
│   ├── data/               # mock-AAPL.json (fallback price data)
│   ├── scripts/seed.js     # CLI data seeding script
│   └── .env                # API keys (not committed)
└── frontend/
    ├── src/
    │   ├── App.jsx          # Main dashboard
    │   └── components/      # SentimentChart · StockChart · OverlayChart · KeywordChart · SentimentDistribution · SummaryCards · LiveAnalysis
    └── vite.config.js       # Vite + /api proxy
```
