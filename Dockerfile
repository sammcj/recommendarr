# Build stage
FROM node:22-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Add build arguments that can be passed during build time
ARG VUE_APP_API_URL
ARG BASE_URL

# Set as environment variables for the build process
ENV VUE_APP_API_URL=${VUE_APP_API_URL}
ENV BASE_URL=${BASE_URL}

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
# Note: API_URL must be set at build time using --build-arg VUE_APP_API_URL

# Install a simple web server for serving static files
RUN npm install -g serve

# Copy startup script and ensure it uses the correct line endings
COPY start-unified.sh /start-unified.sh
# Install dos2unix to fix line endings
RUN apk add --no-cache dos2unix && dos2unix /start-unified.sh && chmod +x /start-unified.sh

# Expose ports
EXPOSE 3030 3050

# Start both services
CMD ["sh", "/start-unified.sh"]