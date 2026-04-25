# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install server dependencies (production only)
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy database schema
COPY database.sql ./

# Copy the built React app from Stage 1
COPY --from=build-client /app/client/dist ./client/dist

# SQLite database lives here (mount a volume to persist it)
VOLUME ["/app/server"]

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server/app.js"]
