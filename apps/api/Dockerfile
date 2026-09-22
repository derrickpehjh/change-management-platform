# Build context must be the monorepo root (`docker build -f apps/api/Dockerfile .`)
# so npm workspaces can resolve @cmp/shared. This same image is meant to be the
# starting point for the real production container later, not just the POC.

FROM node:20-slim AS builder
WORKDIR /repo

COPY . .
RUN npm ci
RUN npm run build --workspace=packages/shared
RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api

FROM node:20-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/packages/shared ./packages/shared
COPY --from=builder /repo/apps/api ./apps/api

WORKDIR /repo/apps/api
EXPOSE 4000

# `db push` (not `migrate deploy`) on purpose: the POC's Supabase schema was
# applied directly via a SQL migration outside Prisma's own migration history,
# so there's no _prisma_migrations row for `migrate deploy` to reconcile
# against — it would try to re-run the initial migration and fail on
# already-existing tables. `db push` just diffs schema.prisma against the live
# DB and is a no-op once they match. Switch back to `migrate deploy` once real
# migration history is established for production.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/main.js"]
