# =========================================================================
# Production Server (Node.js Express Backend & Static Host)
# =========================================================================
FROM node:20-alpine

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

# Copy backend source code (including compiled public static assets)
COPY AI-Legal_App_BAckend/ ./

# Configure Cloud Run environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose port for GCP Cloud Run
EXPOSE 8080

# Start backend server (serves API, WebSockets, and SPA frontend)
CMD ["node", "server.js"]
