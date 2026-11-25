# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React/Vite app
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cached when package files don't change)
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .
# VITE_ env vars must be provided at build time (baked into the bundle).
# docker-compose passes them via build args → ARG → ENV.
# When VITE_API_URL is empty, apiClient falls back to http://localhost:5001/api
# In Docker, nginx proxies /api → server:5001 on the same origin so leave it empty.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Serve with nginx (tiny production image)
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config: serve SPA and proxy /api → server
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
