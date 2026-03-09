# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js .
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Serve static files from the tool server
# In production, server.js also serves the built frontend
EXPOSE 3001
CMD ["node", "server.js"]
