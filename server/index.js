import express from 'express';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

const dataDir = process.env.BOARD_DATA_DIR ?? path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const uploadsDir = path.join(dataDir, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = process.env.BOARD_DB_PATH ?? path.join(dataDir, 'board.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS board_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    hash TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertFile = db.prepare(`
  INSERT OR IGNORE INTO files (hash, filename, mime_type, size, uploaded_at)
  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

const selectFile = db.prepare('SELECT * FROM files WHERE hash = ?');

const selectState = db.prepare('SELECT data, updated_at FROM board_state WHERE id = 1');
const selectVersion = db.prepare('SELECT updated_at FROM board_state WHERE id = 1');
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
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
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
        const data = JSON.parse(row.data);
        // Include version in response for sync
        data._version = row.updated_at;
        res.json(data);
    } catch (error) {
        console.error('Failed to load board state:', error);
        res.status(500).json({ error: 'Failed to load board state' });
    }
});

// Quick version check endpoint for polling
app.get('/api/board/version', (req, res) => {
    try {
        const row = selectVersion.get();
        if (!row) {
            res.status(204).end();
            return;
        }
        res.json({ version: row.updated_at });
    } catch (error) {
        console.error('Failed to get version:', error);
        res.status(500).json({ error: 'Failed to get version' });
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

// File upload endpoint
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/json',
    'application/zip',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

app.post('/api/files', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
    try {
        const contentType = req.get('Content-Type') || 'application/octet-stream';
        const filename = req.get('X-Filename') || 'unnamed';
        
        // Validate content type
        const mimeType = contentType.split(';')[0].trim();
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            res.status(400).json({ error: `File type not allowed: ${mimeType}` });
            return;
        }
        
        const buffer = req.body;
        if (!buffer || buffer.length === 0) {
            res.status(400).json({ error: 'No file data received' });
            return;
        }
        
        if (buffer.length > MAX_FILE_SIZE) {
            res.status(400).json({ error: 'File too large (max 10MB)' });
            return;
        }
        
        // Hash the file content
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        
        // Determine file extension from mime type
        const extMap = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'application/pdf': '.pdf',
            'text/plain': '.txt',
            'application/json': '.json',
            'application/zip': '.zip',
        };
        const ext = extMap[mimeType] || '';
        const storedFilename = hash + ext;
        const filePath = path.join(uploadsDir, storedFilename);
        
        // Write file if it doesn't exist (deduplication)
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, buffer);
        }
        
        // Store metadata in database
        insertFile.run(hash, filename, mimeType, buffer.length);
        
        // Return file info
        res.json({
            hash,
            filename,
            mimeType,
            size: buffer.length,
            url: `/api/files/${hash}`,
        });
    } catch (error) {
        console.error('Failed to upload file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Serve uploaded files
app.get('/api/files/:hash', (req, res) => {
    try {
        const { hash } = req.params;
        
        // Validate hash format (SHA-256 = 64 hex chars)
        if (!/^[a-f0-9]{64}$/i.test(hash)) {
            res.status(400).json({ error: 'Invalid file hash' });
            return;
        }
        
        // Get file metadata
        const fileInfo = selectFile.get(hash);
        if (!fileInfo) {
            res.status(404).json({ error: 'File not found' });
            return;
        }
        
        // Find the file on disk
        const extMap = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'application/pdf': '.pdf',
            'text/plain': '.txt',
            'application/json': '.json',
            'application/zip': '.zip',
        };
        const ext = extMap[fileInfo.mime_type] || '';
        const filePath = path.join(uploadsDir, hash + ext);
        
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'File not found on disk' });
            return;
        }
        
        // Set headers and send file
        res.setHeader('Content-Type', fileInfo.mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${fileInfo.filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.sendFile(filePath);
    } catch (error) {
        console.error('Failed to serve file:', error);
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

// Serve static frontend in production (Docker)
if (process.env.SERVE_STATIC === 'true') {
    const distPath = path.join(rootDir, 'dist');

    // Serve static files
    app.use(express.static(distPath));

    // SPA fallback - serve index.html for all non-API routes
    // Express 5 requires named wildcard parameter syntax
    app.get('/{*splat}', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });

    console.log(`Serving static files from ${distPath}`);
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
    console.log(`Board API listening on http://localhost:${port}`);
});
