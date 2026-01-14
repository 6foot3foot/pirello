# PiRello (Trello-ish) Board

This app stores board state via a local API backed by SQLite so it persists across browsers and devices.

## Setup

```bash
pnpm install
```

If `better-sqlite3` build scripts are blocked, run:

```bash
pnpm approve-builds
pnpm rebuild better-sqlite3
```

## Run (dev)

In one terminal:

```bash
pnpm run server
```

In another terminal:

```bash
pnpm run dev
```

Vite proxies `/api` to `http://localhost:3001` during dev.

## Run (production)

Build and serve the frontend however you prefer, and run the API on the Pi:

```bash
pnpm run server
```

If the frontend is hosted on a different origin, set `VITE_API_BASE` to the API URL (for example, `http://pi.local:3001`).

## Environment variables

- `PORT` (default `3001`) - API server port
- `BOARD_DATA_DIR` - directory for SQLite database file
- `BOARD_DB_PATH` - full path to SQLite database file (overrides `BOARD_DATA_DIR`)
- `CORS_ORIGIN` - allowed origin for the API (default `*`)
