#!/bin/sh
set -e

echo "Waiting for PostgreSQL database connection and pushing schema..."
max_retries=10
count=0
until ./node_modules/.bin/prisma db push --accept-data-loss; do
  count=$((count + 1))
  if [ $count -ge $max_retries ]; then
    echo "Failed to connect to database after $max_retries attempts."
    exit 1
  fi
  echo "Database connection attempt $count failed. Retrying in 3 seconds..."
  sleep 3
done

echo "Seeding initial database data..."
./node_modules/.bin/tsx scripts/seed-devices.ts || true

echo "Starting Next.js application..."
exec "$@"
