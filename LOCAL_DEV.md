# Local Development Guide

## Quick Start (Without Docker)

```bash
./local/start.sh
```

Opens: http://localhost:8080/local/index-local.html

To stop:
```bash
./local/stop.sh
```

## Prerequisites

- PostgreSQL installed: `brew install postgresql@16`
- Node.js installed: `brew install node`

## What Gets Committed to GitHub?

✅ **Production code** (goes to GitHub/CI/CD):
- `backend/` - Production API code
- `frontend/` - Production frontend (works with nginx proxy)
- `db/` - Liquibase migrations
- `k8s/` - Kubernetes manifests
- `harness/` - CI/CD pipeline
- `docker-compose.yml` - For Docker-based testing
- Unit tests in `__tests__/` folders

❌ **Local development files** (ignored by git):
- `local/` folder - Scripts and files for running locally without Docker
- `node_modules/` - npm dependencies (installed fresh in CI/CD)
- `*.log` - Local logs
- `*.pid` - Process IDs

## Running with Docker (Production-like)

```bash
docker compose up --build
```

Opens: http://localhost:8080

This uses the **production setup**: nginx, backend, PostgreSQL, Liquibase migrations.

## Unit Tests

Backend:
```bash
cd backend
npm install
npm test
```

Frontend:
```bash
cd frontend
npm install
npm test
```

Tests use **mocks** (no database/services needed).

## CI/CD in Harness

Your GitHub repo contains everything Harness needs:
1. Dockerfiles build images (npm install happens inside Docker)
2. Kubernetes manifests deploy to EKS
3. Liquibase runs migrations
4. Unit tests can run in CI pipeline

The `local/` folder **never goes to production** - it's just for your laptop!
