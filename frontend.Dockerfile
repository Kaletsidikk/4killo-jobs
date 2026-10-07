FROM node:20-alpine AS builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/frontend/dist ./dist

RUN npm install -g serve

ENV NODE_ENV=production

EXPOSE 3000

CMD serve dist -s -l ${PORT:-3000}
