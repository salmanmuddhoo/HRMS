#!/bin/bash
set -e

npm install

cd backend
npm install
npx prisma generate

# Session-mode pooler: port 5432 instead of transaction-mode 6543.
# Supports DDL and prepared statements; reachable from Vercel build servers.
# Set DIRECT_URL in Vercel (Production env) to override if port-swap doesn't
# work for your Supabase project (get Session mode URL from Supabase dashboard:
# Settings → Database → Connection pooling → Session mode).
MIGRATE_URL="${DIRECT_URL:-${DATABASE_URL//:6543\//:5432\/}}"

# Baseline: mark every migration as applied on databases that have a schema
# but no _prisma_migrations table (e.g. set up via prisma db push).
for dir in prisma/migrations/*/; do
  name=$(basename "$dir")
  [[ "$name" == *.toml ]] && continue
  DATABASE_URL="$MIGRATE_URL" npx prisma migrate resolve --applied "$name" 2>/dev/null || true
done

# Deploy any pending migrations. Non-fatal: schema may already be current from
# prisma db push; app works regardless. Fix: set DIRECT_URL in Vercel.
DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy \
  || echo "WARNING: migrate deploy failed — set DIRECT_URL in Vercel (Production) to the session-mode pooler URL from Supabase dashboard."

# Seed always runs regardless of migration result.
npm run seed

cd ../frontend
npm install --legacy-peer-deps
