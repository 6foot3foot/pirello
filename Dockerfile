# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm and dependencies for building native modules (better-sqlite3)
RUN corepack enable pnpm && \
    apk add --no-cache python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the frontend
RUN pnpm run build

# Prune dev dependencies, keeping only production deps with compiled native modules
RUN pnpm prune --prod

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Copy node_modules from builder (includes compiled native modules)
COPY --from=builder /app/node_modules ./node_modules

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server ./server

# Create data directory
RUN mkdir -p /data

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV BOARD_DATA_DIR=/data
ENV SERVE_STATIC=true

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/board || exit 1

# Run the server
CMD ["node", "server/index.js"]
