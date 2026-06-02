FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm install -g pnpm@10

# Install all workspace deps including waslney's local node_modules
RUN pnpm install --no-frozen-lockfile

# Build using the vite installed by pnpm in the workspace
RUN cd artifacts/waslney && pnpm exec vite build --config vite.config.ts

# Install backend deps
RUN cd backend && npm install --legacy-peer-deps

EXPOSE 3001

CMD ["node", "backend/server.js"]
