# Build stage
FROM node:22-alpine as build-stage
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files (excluding backup directory)
COPY public ./public
COPY src ./src
COPY babel.config.js ./
COPY jsconfig.json ./
COPY vue.config.js ./

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy built frontend from build stage
COPY --from=build-stage /app/dist ./dist

# Copy server files
COPY server ./server

# Create data directory
RUN mkdir -p ./server/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the combined server
CMD ["node", "server/server.js"]
