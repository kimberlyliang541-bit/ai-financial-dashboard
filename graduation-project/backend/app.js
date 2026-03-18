require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const newsRoutes      = require('./routes/news');
const sentimentRoutes = require('./routes/sentiment');
const stocksRoutes    = require('./routes/stocks');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/news',      newsRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/stocks',    stocksRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
