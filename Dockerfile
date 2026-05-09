# ---- Build Stage ----
FROM node:26-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:26-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ ./dist/

# Health check: ping the bot's health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Run as non-root user
USER appuser

EXPOSE 3000
CMD ["node", "dist/index.js"]
