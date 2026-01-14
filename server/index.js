import express from 'express';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.BOARD_DATA_DIR ?? path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.BOARD_DB_PATH ?? path.join(dataDir, 'board.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS board_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const selectState = db.prepare('SELECT data FROM board_state WHERE id = 1');
const upsertState = db.prepare(`
  INSERT INTO board_state (id, data, updated_at)
  VALUES (1, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET
    data = excluded.data,
    updated_at = CURRENT_TIMESTAMP
`);
const deleteState = db.prepare('DELETE FROM board_state WHERE id = 1');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/api/board', (req, res) => {
  try {
    const row = selectState.get();
    if (!row) {
      res.status(204).end();
      return;
    }
    res.json(JSON.parse(row.data));
  } catch (error) {
    console.error('Failed to load board state:', error);
    res.status(500).json({ error: 'Failed to load board state' });
  }
});

app.put('/api/board', (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Invalid board payload' });
      return;
    }
    upsertState.run(JSON.stringify(req.body));
    res.status(204).end();
  } catch (error) {
    console.error('Failed to save board state:', error);
    res.status(500).json({ error: 'Failed to save board state' });
  }
});

app.delete('/api/board', (req, res) => {
  try {
    deleteState.run();
    res.status(204).end();
  } catch (error) {
    console.error('Failed to clear board state:', error);
    res.status(500).json({ error: 'Failed to clear board state' });
  }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`Board API listening on http://localhost:${port}`);
});
