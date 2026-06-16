# ── Stage 1: Build React app ─────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# VITE_API_URL và VITE_WS_URL sẽ được inject lúc runtime qua env-config.js
# (xem nginx/entrypoint bên dưới), không hardcode ở build time
RUN npm run build

# ── Stage 2: Serve bằng nginx ─────────────────────────────────────────────────
FROM nginx:alpine

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]




