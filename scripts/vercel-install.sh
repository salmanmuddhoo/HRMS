#!/bin/bash
set -e

npm install

cd backend
npm install
npx prisma generate

# Session-mode pooler: same host as DATABASE_URL but port 5432 (not 6543).
# Supports DDL and prepared statements; reachable from Vercel build servers.
# DIRECT_URL override still respected if explicitly set correctly.
MIGRATE_URL="${DIRECT_URL:-${DATABASE_URL//:6543\//:5432\/}}"
(DATABASE_URL="$MIGRATE_URL" npx prisma migrate resolve --rolled-back 20260422000000_float_to_decimal || true)
DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy

npm run seed

cd ../frontend
npm install --legacy-peer-deps
