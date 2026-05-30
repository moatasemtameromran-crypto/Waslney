FROM node:18-alpine

WORKDIR /app

COPY . .

# Install pnpm
RUN npm install -g pnpm@10

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Build the frontend
RUN cd artifacts/waslney && npx vite build --config vite.config.ts

# Install backend dependencies
RUN cd backend && npm install

EXPOSE 3001

CMD ["node", "backend/server.js"]
