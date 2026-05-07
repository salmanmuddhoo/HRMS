#!/bin/bash
set -e

npm install

cd backend
npm install
npx prisma generate

MIGRATE_URL="${DIRECT_URL:-$DATABASE_URL}"
(DATABASE_URL="$MIGRATE_URL" npx prisma migrate resolve --rolled-back 20260422000000_float_to_decimal || true)
DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy

npm run seed

cd ../frontend
npm install --legacy-peer-deps
