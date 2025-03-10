#!/bin/bash

# Build a test Docker image with the single-port changes
echo "Building test Docker image..."

# Build the Docker image
docker build -t recommendarr:unified-test .

# Run the container with the unified port
echo "Running container with unified port 3000..."
docker run -d \
  --name recommendarr-unified-test \
  -p 3000:3000 \
  -e PORT=3000 \
  -v recommendarr-unified-test-data:/app/server/data \
  recommendarr:unified-test

echo ""
echo "Container should now be accessible at http://localhost:3000"
echo "Check Docker logs with: docker logs recommendarr-unified-test"