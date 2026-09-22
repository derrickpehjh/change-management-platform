# Build context must be the monorepo root (`docker build -f apps/api/Dockerfile .`)
# so npm workspaces can resolve @cmp/shared. This same image is meant to be the
# starting point for the real production container later, not just the POC.

FROM node:20-slim AS builder
WORKDIR /repo

# Prisma's engines need OpenSSL to detect the right libssl target — without
# it, `prisma db push`/`generate` fail version detection and retry forever
# rather than erroring out cleanly.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY . .
RUN npm ci
RUN npm run build --workspace=packages/shared
RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api

FROM node:20-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/packages/shared ./packages/shared
COPY --from=builder /repo/apps/api ./apps/api

WORKDIR /repo/apps/api
EXPOSE 4000

RUN chmod +x entrypoint.sh
USER node
CMD ["./entrypoint.sh"]
