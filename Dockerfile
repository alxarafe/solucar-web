# Solucar development Dockerfile
# Uses explicitly versioned Node 24 image

FROM node:24.19.0-bookworm-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Default command runs development server
EXPOSE 4200
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200"]