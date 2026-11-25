# ─────────────────────────────────────────────────────────────────────────────
# CloudVault — Express API Server
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install production dependencies only (layer-cached)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --frozen-lockfile

# Copy application source
COPY . .

# Transfer ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Server listens on 5001 (matches your existing .env PORT=5001)
EXPOSE 5001

# Health-check: ping the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5001/api/health || exit 1

CMD ["node", "server.js"]
