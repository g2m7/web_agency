#!/bin/sh
set -e

echo "Running Payload migrations..."
node node_modules/payload/dist/bin/migrate.js

echo "Starting server..."
exec node server.js
