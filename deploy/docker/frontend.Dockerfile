# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy frontend source code
COPY frontend/ ./

# Set API base URL to relative path so Nginx can proxy it
ENV VITE_API_BASE_URL=/api

# Build the frontend
RUN npm run build

# Serve stage
FROM nginx:alpine
# Copy custom Nginx configuration
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
