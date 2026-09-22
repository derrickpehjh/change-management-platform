# Build context must be the monorepo root (`docker build -f apps/web/Dockerfile .`)
# so npm workspaces can resolve @cmp/shared.

FROM node:20-slim AS builder
WORKDIR /repo

COPY . .
RUN npm ci
RUN npm run build --workspace=packages/shared
# Bake /api as the API base URL so the browser always talks to this app's own
# origin. NEXT_PUBLIC_* vars are inlined at next build time, not read at
# runtime, so this must be set here rather than via a pod env var.
ENV NEXT_PUBLIC_API_URL=/api
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
