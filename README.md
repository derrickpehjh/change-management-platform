# Change Management Platform

A web platform connecting **Vendors** and **HTX** around change request (CR)
submission, approval, and a shared maintenance calendar. See the [PRD](
https://claude.ai/artifact/F8Ypzx6h4gf2PmTs8Vcirj) for full product
requirements.

## Stack

- `apps/web` — Next.js 14 (App Router) + TypeScript + Tailwind, TanStack Query
- `apps/api` — NestJS + Prisma + PostgreSQL
- `packages/shared` — enums/types shared by both apps

## Running with Docker (recommended)

The easiest way to run the full stack — no local Node.js or Postgres required.

**Prerequisites:** Docker Desktop running.

```bash
# 1. Create your env file
cp docker/.env.example docker/.env

# 2. Build and start all four services (postgres, redis, api, web)
docker compose -f docker/docker-compose.yml up --build

# 3. In a separate terminal, seed dummy data (first time only)
docker exec docker-api-1 npx prisma db seed
```

Open http://localhost:3001 — you'll see a login picker with all seeded users.

> **Note:** If port 3001 is in use, edit `docker/docker-compose.yml` and change
> `"3001:3000"` under the `web` service to any free port.

**Subsequent runs** (no code changes):
```bash
docker compose -f docker/docker-compose.yml up
```

**Tear down:**
```bash
docker compose -f docker/docker-compose.yml down      # stop, keep DB data
docker compose -f docker/docker-compose.yml down -v   # stop + wipe DB
```

---

## Local development setup (without Docker)

**Prerequisites:** Node.js 20+, PostgreSQL 14+ running locally.

```bash
# 1. Install dependencies (npm workspaces — one install covers all apps)
npm install

# 2. Create the database
createuser cmp --login --pwprompt   # password: cmp
createdb cmp --owner=cmp

# 3. Configure env vars
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 4. Run migrations and seed dummy data (vendor orgs, users, sample CRs)
npm run prisma:migrate
npm run prisma:seed

# 5. Start both apps (two terminals, or run each in the background)
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:3000
```

Open http://localhost:3000 — you'll land on a dummy login screen listing the
seeded users: two Customer-role users (HTX), two vendor companies each with a
couple of Vendor-role users, and one "pending access" account to demonstrate
the onboarding flow.

## Authentication modes

Controlled by `AUTH_MODE` in `apps/api/.env`:

- **`mock`** (default) — the login screen lists seeded dummy accounts; click
  one to sign in as them. No GitLab instance required. This is what's wired
  up right now.
- **`gitlab`** — real SSO against a **self-hosted** GitLab instance via
  OpenID Connect. To switch over:
  1. On your GitLab instance, register an OAuth application (User Settings →
     Applications, or an instance-wide Application under Admin Area) with
     scopes `openid email profile` and callback URL
     `{API origin}/auth/gitlab/callback`.
  2. Fill in `GITLAB_ISSUER_URL`, `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`,
     `GITLAB_CALLBACK_URL` in `apps/api/.env`.
  3. Set `AUTH_MODE=gitlab` and restart the API.
  4. First-time GitLab logins land as **pending** — a Customer-role (HTX)
     user must assign their org + role from Admin → Users & Access before
     they can use the platform (only HTX knows which vendor company a given
     GitLab account belongs to).

## Multi-tenancy

Every vendor-scoped table (`ChangeRequest`, `Comment`, `Attachment`,
`CRAuditLog`) is scoped by `vendorOrgId` at the application's data-access
layer — see `apps/api/src/common/tenant.ts`. `apps/api/prisma/rls.sql` adds
an optional, defense-in-depth Postgres row-level-security layer for
production (see the comments in that file for the non-superuser DB role it
requires — RLS is inert against a superuser connection, which is what local
dev uses by default).

## What's implemented

- GitLab-SSO-shaped auth (mock picker for now; real OIDC scaffolded)
- Two roles: **Vendor** and **Customer** (HTX) — the Customer role also
  handles admin tasks (user access, system assets, vendor onboarding); there
  is no separate admin tier on either side
- CR lifecycle: Draft → Submitted → Under Review → Approved/Rejected →
  (Scheduled) → Implemented → Closed, with edit-and-resubmit after rejection
  and vendor withdraw
- Rich CR fields, comments, file attachments, full audit trail
- Maintenance calendar with cross-vendor conflict detection (warnings only,
  never exposing another vendor's identity to a vendor caller)
- Role-scoped overview dashboard
- Email + in-app notifications (email is a `console.log` stub — see
  `apps/api/src/notifications/notifications.service.ts` — swap in a real
  provider when one is available)
- Admin (Customer role): vendor org onboarding, system/asset management,
  user role assignment

## Explicitly out of scope for this MVP

SLA escalation, CAB/multi-approver workflows, third-party integrations
(Jira/ServiceNow/Slack/Teams/ICS export), deeper trend analytics, native
mobile app. See the PRD for the full list.
