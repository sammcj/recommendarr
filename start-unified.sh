#!/bin/sh

# Start API server in the background
node server/server.js &

# Start frontend server
# The PUBLIC_URL environment variable will be available to the frontend code
# but we don't need to pass it to the serve command as it doesn't support --public
serve -s dist -l 3030