# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies for building native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for building)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    # Clean up build dependencies
    apk del python3 make g++ && \
    rm -rf /root/.npm /tmp/*

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
