FROM node:22-alpine

WORKDIR /app

COPY . .

# Install pnpm
RUN npm install -g pnpm@10

# Install workspace deps (resolves @workspace/* packages)
RUN pnpm install --no-frozen-lockfile

# Install vite and deps locally inside waslney so npx finds them
RUN cd artifacts/waslney && npm install --legacy-peer-deps

# Now build using the local vite
RUN cd artifacts/waslney && ./node_modules/.bin/vite build --config vite.config.ts

# Install backend deps
RUN cd backend && npm install --legacy-peer-deps

EXPOSE 3001

CMD ["node", "backend/server.js"]
