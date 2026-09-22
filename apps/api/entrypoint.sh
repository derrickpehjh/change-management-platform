#!/bin/sh
set -e

# Deploy any pending migrations. Safe under concurrent pod starts —
# Prisma holds an advisory lock so only one pod runs migrations at a time.
npx prisma migrate deploy

exec node dist/src/main.js
