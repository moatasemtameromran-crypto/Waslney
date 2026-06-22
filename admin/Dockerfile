# syntax=docker/dockerfile:1

# ───────── Stage 1: build the admin-panel (frontend) ─────────
FROM node:20-slim AS frontend
WORKDIR /app/admin-panel
COPY admin-panel/package.json admin-panel/package-lock.json ./
RUN npm ci || npm install
COPY admin-panel/ ./
RUN npm run build

# ───────── Stage 2: build the api-server (backend) ─────────
FROM node:20-slim AS backend
WORKDIR /app/api-server
COPY api-server/package.json api-server/package-lock.json ./
RUN npm ci || npm install
COPY api-server/ ./
RUN npm run build

# ───────── Stage 3: runtime (serves API + built frontend) ─────────
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend /app/api-server/dist ./dist
COPY --from=backend /app/api-server/node_modules ./node_modules
COPY --from=backend /app/api-server/package.json ./package.json
COPY --from=frontend /app/admin-panel/dist/public ./public
ENV PUBLIC_DIR=/app/public
EXPOSE 4000
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
