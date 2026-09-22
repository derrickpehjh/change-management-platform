#!/bin/sh
set -e

# Baseline any migrations that were previously applied outside Prisma's own
# migration history (e.g. via `db push` against Supabase). The `|| true` makes
# each call a no-op if the migration is already recorded, so this is safe to
# run on every pod start regardless of DB state.
npx prisma migrate resolve --applied 20260922044806_init 2>/dev/null || true
npx prisma migrate resolve --applied 20260922085428_add_requested_vendor_org 2>/dev/null || true
npx prisma migrate resolve --applied 20260922100222_add_vendor_reference 2>/dev/null || true

# Deploy pending migrations atomically. Safe under concurrent pod starts:
# Prisma holds an advisory lock so only one pod runs migrations at a time.
npx prisma migrate deploy

exec node dist/src/main.js
