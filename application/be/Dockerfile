FROM node:20-alpine

WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Không copy node_modules từ host (đã install ở trên)
# Không cần build step vì là plain Node.js

EXPOSE 3001

CMD ["node", "index.js"]




