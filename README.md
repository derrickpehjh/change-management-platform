# Change Management Platform

A web platform connecting **Vendors** and **HTX** around change request (CR)
submission, approval, and a shared maintenance calendar.

## Stack

- `apps/web` — Next.js 14 (App Router) + TypeScript + Tailwind, TanStack Query
- `apps/api` — NestJS + Prisma + PostgreSQL
- `packages/shared` — enums/types shared by both apps

---

## Quick start — Docker Hub (no code needed)

**Prerequisites:** Docker Desktop running.

```bash
# 1. Grab the two config files
curl -O https://raw.githubusercontent.com/derrickpehjh/change-management-platform/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/derrickpehjh/change-management-platform/main/.env.example

# 2. Configure and start
cp .env.example .env          # open .env and set JWT_SECRET
docker compose up -d
```

Open **http://localhost:3001** — images are pulled from Docker Hub automatically.
Demo users and sample CRs are seeded on first boot.

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3001 |
| API | http://localhost:4000 |
| MinIO console | http://localhost:9001 (minioadmin / minioadmin) |

**Tear down:**
```bash
docker compose down       # stop, keep data
docker compose down -v    # stop + wipe all data
```

---

## Docker images

| Image | Docker Hub |
|-------|-----------|
| API | `derrickpehjh/cmp-api:latest` |
| Web | `derrickpehjh/cmp-web:latest` |

---

## Development — build from source

**Prerequisites:** Docker Desktop running.

```bash
# Build images locally and start the full stack
docker compose -f docker/docker-compose.yml up --build
```

Data is seeded automatically on first boot.

---

## Local development (no Docker)

**Prerequisites:** Node.js 20+, PostgreSQL 14+ running locally.

```bash
npm install
createuser cmp --login --pwprompt   # password: cmp
createdb cmp --owner=cmp
cp apps/api/.env.example apps/api/.env
npm run prisma:migrate
npm run prisma:seed
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:3000
```

---

## Authentication modes

Controlled by `AUTH_MODE` in `.env`:

- **`mock`** (default) — login screen lists seeded accounts; click one to sign in. No external service required.
- **`gitlab`** — real SSO against a self-hosted GitLab instance via OIDC. Set `GITLAB_ISSUER_URL`, `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`, `GITLAB_CALLBACK_URL` and `AUTH_MODE=gitlab`.

---

## Features

- CR lifecycle: Draft → Submitted → Under Review → Approved/Rejected → Scheduled → Implemented → Closed
- Cross-vendor conflict detection on the maintenance calendar
- File attachments via MinIO (S3-compatible)
- Full audit trail, comments, role-scoped dashboards
- Admin: vendor org onboarding, system asset management, user role assignment
- Multi-tenant data isolation — vendors only see their own CRs

## Health endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health/live` | Liveness — process is alive |
| `GET /health/ready` | Readiness — DB connected, migrations applied |
