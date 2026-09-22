# Build context must be the monorepo root (`docker build -f apps/web/Dockerfile .`)
# so npm workspaces can resolve @cmp/shared.

FROM node:20-slim AS builder
WORKDIR /repo

COPY . .
RUN npm ci
RUN npm run build --workspace=packages/shared
# Both vars are consumed by next build, not next start:
# - NEXT_PUBLIC_API_URL is inlined into the JS bundle by the compiler
# - API_PROXY_ORIGIN is written into routes-manifest.json as the rewrite dest
# Pass --build-arg API_PROXY_ORIGIN=<url> to override the default (e.g. for K8s
# where the API service has a different internal hostname).
ARG API_PROXY_ORIGIN=http://api:4000
ENV NEXT_PUBLIC_API_URL=/api
ENV API_PROXY_ORIGIN=$API_PROXY_ORIGIN
RUN npm run build --workspace=apps/web

FROM node:20-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production

# Copy only what Next.js needs to run
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/packages/shared ./packages/shared
COPY --from=builder /repo/apps/web ./apps/web

WORKDIR /repo/apps/web
EXPOSE 3000

CMD ["npm", "run", "start"]
