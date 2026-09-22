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

# Applies any pending Prisma migrations on boot, then starts the API. Safe to
# run on every deploy — a no-op when the schema is already up to date.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
