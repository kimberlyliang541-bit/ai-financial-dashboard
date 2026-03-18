CREATE TABLE IF NOT EXISTS news (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  headline        TEXT    NOT NULL,
  summary         TEXT,
  source          TEXT,
  url             TEXT,
  datetime        INTEGER,
  related_symbol  TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sentiment_scores (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id      INTEGER NOT NULL,
  sentiment    TEXT    NOT NULL,
  confidence   REAL    NOT NULL,
  reason       TEXT,
  analyzed_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (news_id) REFERENCES news(id)
);

CREATE TABLE IF NOT EXISTS stock_prices (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol  TEXT    NOT NULL,
  date    TEXT    NOT NULL,
  open    REAL,
  close   REAL,
  high    REAL,
  low     REAL,
  UNIQUE(symbol, date)
);
