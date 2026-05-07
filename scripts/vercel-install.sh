#!/bin/bash
set -e

npm install

cd backend
npm install
npx prisma generate

# Session-mode pooler: port 5432 instead of transaction-mode 6543.
MIGRATE_URL="${DIRECT_URL:-${DATABASE_URL//:6543\//:5432\/}}"

# Attempt a direct deploy first (works on fresh databases and databases that
# already have migration history).
DEPLOY_OUT=$(DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy 2>&1) && DEPLOY_EXIT=0 || DEPLOY_EXIT=$?
echo "$DEPLOY_OUT"

if [ $DEPLOY_EXIT -ne 0 ]; then
  if echo "$DEPLOY_OUT" | grep -q "P3005"; then
    # P3005: database has tables (from prisma db push) but no _prisma_migrations
    # table. Baseline only the migrations that were already applied via db push,
    # then deploy everything newer so it actually runs.
    #
    # Update BASELINE_CUTOFF whenever a new "already pushed" migration exists.
    BASELINE_CUTOFF="20260507000001_sick_leave_bank"

    echo "P3005 detected — baselining migrations up to $BASELINE_CUTOFF ..."
    for dir in prisma/migrations/*/; do
      name=$(basename "$dir")
      [[ "$name" == *.toml ]] && continue
      # Stop baselining at the first migration newer than the cutoff so it
      # gets deployed (and actually executed) in the step below.
      [[ "$name" > "$BASELINE_CUTOFF" ]] && break
      DATABASE_URL="$MIGRATE_URL" npx prisma migrate resolve --applied "$name" 2>/dev/null || true
    done

    DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy \
      || echo "WARNING: migrate deploy failed after baseline — set DIRECT_URL in Vercel to the session-mode pooler URL (Supabase → Settings → Database → Connection pooling)."
  else
    echo "WARNING: migrate deploy failed — set DIRECT_URL in Vercel to the session-mode pooler URL (Supabase → Settings → Database → Connection pooling)."
  fi
fi

npm run seed

cd ../frontend
npm install --legacy-peer-deps
