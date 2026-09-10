# =========================================================================
# Stage 1: Build Frontend SPA (React + Vite)
# =========================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend dependency manifests and install dependencies
COPY AI-Legal_App_Webapp/package*.json ./
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY AI-Legal_App_Webapp/ ./

# Build production static bundle (dist)
RUN npm run build

# =========================================================================
# Stage 2: Production Server (Node.js Express Backend & Static Host)
# =========================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install native dependencies required by canvas, pdf-parse, sharp, etc.
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

# Copy backend dependency manifests and install production dependencies
COPY AI-Legal_App_BAckend/package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy backend source code
COPY AI-Legal_App_BAckend/ ./

# Copy compiled frontend assets from Stage 1 into backend's public directory
COPY --from=frontend-builder /app/frontend/dist/ ./public/

# Configure Cloud Run environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose port for GCP Cloud Run
EXPOSE 8080

# Start backend server (serves API, WebSockets, and SPA frontend)
CMD ["node", "server.js"]
