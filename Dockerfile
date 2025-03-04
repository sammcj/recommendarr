# Build stage
FROM node:22-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Final stage
FROM node:22-alpine
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy server files
COPY server ./server

# Copy built frontend from build stage
COPY --from=build-stage /app/dist ./dist

# Set environment variables
ENV DOCKER_ENV=true
ENV PORT=3050

# Install a simple web server for serving static files
RUN npm install -g serve

# Copy startup script
COPY start-unified.sh /start-unified.sh
RUN chmod +x /start-unified.sh

# Expose ports
EXPOSE 3030 3050

# Start both services
CMD ["/start-unified.sh"]