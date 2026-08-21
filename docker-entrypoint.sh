#!/bin/sh
set -e

echo "Pushing Prisma schema to PostgreSQL database..."
./node_modules/.bin/prisma db push --accept-data-loss

echo "Seeding initial database data if needed..."
./node_modules/.bin/tsx scripts/seed-devices.ts || true

echo "Starting application..."
exec "$@"
