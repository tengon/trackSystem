#!/bin/sh
set -e

echo "Pushing Prisma schema to PostgreSQL database..."
npx prisma db push --accept-data-loss

echo "Seeding initial database data if needed..."
npx tsx scripts/seed-devices.ts || true

echo "Starting application..."
exec "$@"
