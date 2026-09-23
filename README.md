# Change Management Platform

A web platform connecting **Vendors** and **HTX** around change request (CR)
submission, approval, and a shared maintenance calendar.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, TanStack Query |
| Backend | NestJS, Prisma ORM, PostgreSQL |
| Storage | MinIO (S3-compatible file attachments) |
| Shared | `@cmp/shared` — enums and types used by both apps |

---

## Project structure

```
change-management-platform/
├── apps/
│   ├── api/                # NestJS backend (Prisma schema + migrations in prisma/)
│   │   └── src/            # auth, change-requests, users, vendor-orgs, system-assets, storage, health
│   └── web/                # Next.js 14 frontend (App Router)
│       └── src/            # app/, components/, lib/, providers/
├── packages/
│   └── shared/             # @cmp/shared — enums/types shared by api + web
├── docker/
│   └── docker-compose.yml  # build-from-source stack
├── docker-compose.yml      # Docker Hub image stack
├── railway.json            # Railway deploy config (API Dockerfile)
└── .env.example            # environment template
```

---

## Quick start — Docker Hub

No code clone needed. Only Docker is required.

```bash
# 1. Fetch config files
curl -O https://raw.githubusercontent.com/derrickpehjh/change-management-platform/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/derrickpehjh/change-management-platform/main/.env.example

# 2. Set your secret and start
cp .env.example .env
# Edit .env — set JWT_SECRET to any random string (required)
docker compose up -d
```

Images are pulled from Docker Hub automatically. Migrations run and demo data is seeded on first boot.

| Service | URL | Notes |
|---------|-----|-------|
| Web UI | http://localhost:3001 | |
| API | http://localhost:4000 | |
| MinIO console | http://localhost:9001 | minioadmin / minioadmin |

**Tear down:**
```bash
docker compose down       # stop, keep data
docker compose down -v    # stop + wipe all data and volumes
```

---

## Demo accounts

Seeded automatically on first boot:

| Name | Email | Role |
|------|-------|------|
| Alice Tan | alice.tan@htx.example | Customer (HTX) |
| Ben Ong | ben.ong@htx.example | Customer (HTX) |
| Marcus Lee | marcus.lee@stengg.example | Vendor (ST Engineering) |
| Priya Nair | priya.nair@stengg.example | Vendor (ST Engineering) |
| Wei Jie Tan | weijie.tan@ncs.example | Vendor (NCS) |
| Farah Hassan | farah.hassan@ncs.example | Vendor (NCS) |
| Daniel Ong | daniel.ong@singtel.example | Vendor (Singtel) |
| Aisyah Rahman | aisyah.rahman@singtel.example | Vendor (Singtel) |
| Kevin Goh | kevin.goh@newvendor.example | Pending |

In `mock` auth mode any password is accepted.

---

## Docker images

| Image | Docker Hub |
|-------|-----------|
| API | `derrickpehjh/cmp-api:latest` |
| Web | `derrickpehjh/cmp-web:latest` |

---

## Development — build from source

```bash
# Builds images locally and starts the full stack
docker compose -f docker/docker-compose.yml up --build
```

Data is seeded automatically on first boot.

---

## Local development (no Docker)

**Prerequisites:** Node.js 20+, PostgreSQL 14+.

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

## Authentication

Controlled by `AUTH_MODE` in `.env`:

- **`mock`** (default) — login screen lists seeded accounts; click to sign in. No external service required.
- **`gitlab`** — OIDC SSO against a self-hosted GitLab instance. Fill in `GITLAB_ISSUER_URL`, `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`, `GITLAB_CALLBACK_URL` and set `AUTH_MODE=gitlab`.

First-time GitLab logins arrive as **pending** — a Customer (HTX) user must assign their org and role from Admin → Users before they can use the platform.

---

## Configuration

All settings live in `.env` (copy from `.env.example`).

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `JWT_SECRET` | **Yes** | — | Session token signing key. Generate with `openssl rand -base64 32`. |
| `WEB_ORIGIN` | Prod | `http://localhost:3001` | Browser-facing URL of the web app (CORS). |
| `POSTGRES_PASSWORD` | No | `cmp` | Database password. Change for production. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | No | `minioadmin` | MinIO / S3 credentials. Change for production. |
| `S3_PUBLIC_ENDPOINT` | Remote hosts | `http://localhost:9000` | Used in presigned URLs — must be reachable from the browser. |
| `AUTH_MODE` | No | `mock` | `mock` or `gitlab`. |
| `JWT_EXPIRES_IN` | No | `12h` | Session lifetime. |
| `COOKIE_NAME` | No | `cmp_session` | Session cookie name. |
| `COOKIE_CROSS_SITE` | No | `false` | Set `true` when API and web are on different domains. |
| `S3_REGION` | No | `us-east-1` | Needed for AWS S3; ignored by MinIO. |
| `GITLAB_*` | When `AUTH_MODE=gitlab` | — | OIDC SSO settings (see Authentication). |

### Production checklist

- Set a strong, unique `JWT_SECRET` — never reuse the example value.
- Change `POSTGRES_PASSWORD` and the MinIO credentials from their defaults.
- Do **not** run `AUTH_MODE=mock` in production — any password is accepted.
- Set `WEB_ORIGIN` and `S3_PUBLIC_ENDPOINT` to your public hostnames.
- Serve over HTTPS; set `COOKIE_CROSS_SITE=true` only if API and web are on different domains.

---

## Features

- **CR lifecycle** — Draft → Submitted → Under Review → Approved / Rejected → Scheduled → Implemented → Closed
- **Conflict detection** — cross-vendor maintenance window overlap warnings on the calendar
- **File attachments** — uploaded to MinIO, served via presigned URLs
- **Audit trail** — full history of every status change and decision
- **Multi-tenancy** — vendors are scoped to their own CRs; HTX has full fleet visibility
- **Admin panel** — vendor org onboarding, system asset management, user role assignment

---

## Health endpoints (K8s probes)

| Endpoint | Probe type | Checks |
|----------|-----------|--------|
| `GET /health/live` | Liveness | Process is alive |
| `GET /health/ready` | Readiness | DB connected + migrations applied |

---

## Developer

Built and maintained by **Derrick Peh**.

- GitHub: [@derrickpehjh](https://github.com/derrickpehjh)
- Email: derrickpehjh@gmail.com

Issues and feature requests: [GitHub Issues](https://github.com/derrickpehjh/change-management-platform/issues)
