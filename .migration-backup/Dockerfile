FROM node:18-alpine

WORKDIR /app

# Copy everything
COPY . .

# Build frontend → output goes into backend/public (per vite.config.js)
RUN cd frontend && npm install && npm run build

# Install backend dependencies
RUN cd backend && npm install

EXPOSE 3001

CMD ["node", "backend/server.js"]
