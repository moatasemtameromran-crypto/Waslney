FROM node:22-alpine

WORKDIR /app

COPY . .

# Only install backend deps - frontend is pre-built
RUN cd backend && npm install --legacy-peer-deps

EXPOSE 3001

CMD ["node", "backend/server.js"]
