#!/bin/bash
set -e

npm install

cd backend
npm install
npx prisma generate

# Session-mode pooler: port 5432 instead of transaction-mode 6543.
# Supports DDL and prepared statements; reachable from Vercel build servers.
MIGRATE_URL="${DIRECT_URL:-${DATABASE_URL//:6543\//:5432\/}}"

# Baseline: mark every migration as applied on databases that have a schema
# but no _prisma_migrations table (e.g. set up via prisma db push).
# On databases that already track migrations, each --applied call errors and
# the || true keeps the loop going without aborting.
for dir in prisma/migrations/*/; do
  name=$(basename "$dir")
  [[ "$name" == *.toml ]] && continue
  DATABASE_URL="$MIGRATE_URL" npx prisma migrate resolve --applied "$name" 2>/dev/null || true
done

# Deploy any migrations not yet applied (no-op when all are already tracked).
DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy

npm run seed

cd ../frontend
npm install --legacy-peer-deps
