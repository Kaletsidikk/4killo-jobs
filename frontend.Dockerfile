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
ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "serve dist -s -l $PORT"]
