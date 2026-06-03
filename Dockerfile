FROM node:22-alpine

WORKDIR /app

COPY . .

RUN cd backend && npm install --legacy-peer-deps

EXPOSE 3001

CMD ["node", "backend/server.js"]
