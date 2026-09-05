# Use Node.js 20 LTS lightweight alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend source code
COPY . .

# Expose port 8080 for GCP Cloud Run
EXPOSE 8080

# Set default environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Start backend server
CMD ["node", "server.js"]
