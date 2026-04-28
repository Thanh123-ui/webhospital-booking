FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies (production only)
RUN npm ci --omit=dev || npm install --omit=dev

# Copy backend source code
COPY backend/ ./

EXPOSE 5000
CMD ["npm", "start"]
