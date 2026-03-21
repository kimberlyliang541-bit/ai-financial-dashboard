# CLAUDE.md — AI Financial News Sentiment Dashboard

## Project Overview

A full-stack graduation project that fetches financial news via **Finnhub API**, performs sentiment analysis with **SiliconFlow API (Qwen2.5-7B-Instruct)**, and visualizes results in an interactive **React** dashboard.

Stack: React 18 + Chart.js (frontend) · Node.js + Express (backend) · SQLite / better-sqlite3 (database) · Finnhub + SiliconFlow + Alpha Vantage / Stooq APIs

---

## Folder Structure

```
graduation-project/
├── backend/
│   ├── db/
│   │   ├── database.js       # better-sqlite3 connection + schema init
│   │   └── schema.sql        # CREATE TABLE statements
│   ├── routes/
│   │   ├── news.js           # GET /api/news, POST /api/news/fetch
│   │   ├── sentiment.js      # GET /api/sentiment/trend, POST /api/sentiment/analyze
│   │   └── stocks.js         # GET /api/stocks/price
│   ├── data/
│   │   └── mock-AAPL.json    # Fallback stock price data (level 3)
│   ├── services/
│   │   ├── finnhubService.js # fetchNews(), fetchCandles() (3-level fallback)
│   │   └── aiService.js      # analyzeSentiment() via SiliconFlow
│   ├── .env                  # API keys — NOT committed
│   ├── .env.example          # Template for .env
│   ├── app.js                # Express entry point
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── vite.config.js        # Vite + proxy /api → localhost:3000
│   ├── src/
│   │   ├── components/
│   │   │   ├── SentimentChart.jsx        # Daily sentiment line chart
│   │   │   ├── StockChart.jsx            # Close + MA5/MA20 + High-Low band
│   │   │   ├── OverlayChart.jsx          # Sentiment vs price + Pearson r
│   │   │   ├── KeywordChart.jsx          # Top keywords pie chart
│   │   │   ├── SentimentDistribution.jsx # Positive/Negative/Neutral doughnut
│   │   │   ├── SummaryCards.jsx          # Avg score / article count / trend
│   │   │   └── LiveAnalysis.jsx          # Real-time sentiment input box
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── .gitignore
├── CLAUDE.md                 # This file
└── project_spec.md           # Original PRD + EDD
```

---

## Development Setup

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in FINNHUB_API_KEY and SILICONFLOW_API_KEY
npm install
npm run dev                 # nodemon, port 3000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # Vite, port 5173
```

Open `http://localhost:5173`. Vite proxies `/api/*` to `http://localhost:3000`.

### 3. Seed the database

```bash
# In a separate terminal or with Postman:
curl -X POST http://localhost:3000/api/news/fetch \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","from":"2026-02-01","to":"2026-03-17"}'
```

This pulls news + stock prices from Finnhub, runs Groq sentiment on each headline, and stores everything in `backend/db/sentiment.db`.

---

## Key API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/news` | News list with sentiment; params: `symbol`, `from`, `to` |
| POST | `/api/news/fetch` | Fetch + analyze from Finnhub (data ingestion) |
| GET | `/api/sentiment/trend` | Daily avg sentiment score; params: `symbol`, `from`, `to` |
| GET | `/api/sentiment/distribution` | Positive/negative/neutral counts; params: `symbol`, `from`, `to` |
| POST | `/api/sentiment/analyze` | Analyze arbitrary text via SiliconFlow; body: `{ text }` |
| GET | `/api/stocks/price` | Daily OHLC; params: `symbol`, `from`, `to` |

---

## Database Tables

- **news** — raw article records (headline, source, url, datetime, related_symbol)
- **sentiment_scores** — AI analysis per article (sentiment, confidence, reason); FK → news.id
- **stock_prices** — daily OHLC per symbol/date (UNIQUE constraint prevents duplicates)

---

## Environment Variables (`backend/.env`)

```
FINNHUB_API_KEY=...
SILICONFLOW_API_KEY=...
ALPHA_VANTAGE_API_KEY=...   # Optional; stock prices fall back to Stooq if absent
PORT=3000
```

Never commit `.env`. The SQLite file (`backend/db/sentiment.db`) is also git-ignored.

---

## Development Milestones

| # | Milestone | Status |
|---|-----------|--------|
| M1 | Data ingestion (Finnhub → SQLite) | scaffold ready |
| M2 | AI sentiment layer (Groq → SQLite) | scaffold ready |
| M3 | Historical dashboard (4 charts + filters) | scaffold ready |
| M4 | Live analysis input box | scaffold ready |

---

## Notes & Constraints

- Finnhub free tier: 60 calls/min. Avoid hammering `/api/news/fetch` in rapid succession.
- SiliconFlow free tier: rate-limited. `aiService.js` calls it once per headline; very large batches may be slow.
- Stock price fallback order: Alpha Vantage (25 req/day, needs key) → Stooq (free, no key) → local mock JSON.
- `node-fetch` is pinned to v2 (CommonJS) to work with `require()`. Do not upgrade to v3 without converting backend to ESM.
- Frontend uses a Vite proxy for `/api`, so no CORS issues in dev. In production, set `VITE_API_URL` env var.
