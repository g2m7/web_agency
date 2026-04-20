#!/bin/sh
set -e

echo "Creating Payload migration files..."
node node_modules/payload/dist/bin/index.js migrate:create initial || echo "Migration already exists"

echo "Running Payload migrate:fresh (create all tables)..."
node node_modules/payload/dist/bin/index.js migrate:fresh --force-accept-warning

echo "Starting server..."
exec node server.js
