#!/bin/sh

# Start API server in the background
node server/server.js &

# Start frontend server
serve -s dist -l 3030