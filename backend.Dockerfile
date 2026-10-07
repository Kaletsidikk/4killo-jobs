FROM node:20-alpine AS builder

WORKDIR /app

# Install TypeScript globally in builder
RUN npm install -g typescript

# Copy shared package first (backend depends on @4killo/shared)
COPY shared/ ./shared/

# Build shared package
WORKDIR /app/shared
RUN npm install && npm run build

# Now set up the backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./

# Generate Prisma client
RUN npx prisma generate

# Build backend (just tsc, shared is already compiled)
RUN tsc

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy shared dist (backend needs it at runtime via @4killo/shared)
COPY --from=builder /app/shared ./shared/

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/backend/dist ./dist

ENV NODE_ENV=production

EXPOSE 4000

CMD npx prisma migrate deploy && node dist/index.js
