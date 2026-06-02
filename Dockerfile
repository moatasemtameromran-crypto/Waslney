FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install -g pnpm@10

RUN pnpm install --no-frozen-lockfile

# Run vite build with full error output
RUN cd artifacts/waslney && npx vite build --config vite.config.ts 2>&1 || (echo "=== VITE BUILD FAILED ===" && cat vite.config.ts && exit 1)

RUN cd backend && npm install --legacy-peer-deps

EXPOSE 3001

CMD ["node", "backend/server.js"]
