FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm install -g pnpm@10

RUN pnpm install --no-frozen-lockfile

RUN cd artifacts/waslney && npx vite build --config vite.config.ts

RUN cd backend && npm install --legacy-peer-deps

EXPOSE 3001

CMD ["node", "backend/server.js"]
