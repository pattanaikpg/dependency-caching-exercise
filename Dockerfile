# Deliberately non-optimal Dockerfile — to be optimized in the exercise
# Problem: COPY . . before npm ci invalidates the cache on every code change

FROM node:20-alpine AS builder
WORKDIR /app

# ❌ Copies EVERYTHING at once — any code change invalidates npm ci
COPY . .
RUN npm ci
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
