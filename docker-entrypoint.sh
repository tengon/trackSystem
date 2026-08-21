#!/bin/sh
set -e

PRISMA_BIN="./node_modules/.bin/prisma"
if [ ! -f "$PRISMA_BIN" ]; then
  PRISMA_BIN="npx prisma"
fi

TSX_BIN="./node_modules/.bin/tsx"
if [ ! -f "$TSX_BIN" ]; then
  TSX_BIN="npx tsx"
fi

echo "Waiting for PostgreSQL database connection and pushing schema..."
max_retries=10
count=0
until $PRISMA_BIN db push --accept-data-loss; do
  count=$((count + 1))
  if [ $count -ge $max_retries ]; then
    echo "Failed to connect to database after $max_retries attempts."
    exit 1
  fi
  echo "Database connection attempt $count failed. Retrying in 3 seconds..."
  sleep 3
done

echo "Seeding initial database data..."
$TSX_BIN scripts/seed-devices.ts || true

echo "Starting Next.js application..."
exec "$@"
