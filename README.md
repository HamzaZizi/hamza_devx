# Todo App — Frontend + Backend + Postgres + Liquibase

A minimal 3-tier app you can push to your own repo and deploy through Harness.

## Stack
- **Frontend**: static HTML/CSS/JS served by nginx (proxies `/api/*` to the backend)
- **Backend**: Node.js + Express REST API (`/api/todos`)
- **Database**: PostgreSQL
- **Migrations**: Liquibase changelog (`db/changelog`)

## Structure
```
frontend/     # static site + nginx config + Dockerfile
backend/      # Express API + Dockerfile
db/           # Liquibase changelog + Dockerfile (bundles changelog into an image)
k8s/          # Kubernetes manifests for all 4 pieces
harness/      # sample Harness pipeline referencing the k8s manifests
docker-compose.yml   # spins up db -> liquibase -> backend -> frontend locally
```

## Run it locally
```bash
docker compose up --build
```
- Frontend: http://localhost:8080
- Backend health check: http://localhost:3000/health
- Postgres: localhost:5432 (todo_user/todo_pass)

`docker-compose.yml` runs the `liquibase` service to completion (creating the
`todos` table) before starting the backend, so there's nothing manual to do.

## Deploying via Harness
1. **Build stage(s)**: build and push three images from this repo:
   - `backend/Dockerfile` → `<registry>/todo-backend:<tag>`
   - `frontend/Dockerfile` → `<registry>/todo-frontend:<tag>`
   - `db/Dockerfile` → `<registry>/todo-liquibase:<tag>` (bundles the changelog)
2. **Update manifests**: replace the `<registry>/...:<tag>` placeholders in
   `k8s/02-liquibase-job.yaml`, `k8s/03-backend.yaml`, and `k8s/04-frontend.yaml`
   with your actual image references (Harness can template this with
   `<+artifact.image>` if you use a Kubernetes Service definition instead of
   raw manifests).
3. **Deploy stage**: apply manifests in order — config/secret, postgres,
   the liquibase Job (wait for completion), then backend and frontend.
   `harness/pipeline.yaml` is a starting point showing this as two stages
   (migration, then app rollout).

## Notes
- The Secret in `k8s/00-configmap-secret.yaml` has a plaintext placeholder
  password — swap it for a real secret manager reference before using this
  anywhere real (Harness supports secret managers like Vault/AWS Secrets
  Manager natively).
- The Liquibase Job uses `restartPolicy: Never` and Kubernetes' Job
  semantics so it runs once and exits; make your pipeline wait for it to
  reach `Complete` before rolling out the backend.
- Scale replicas, add resource limits, and add an Ingress as needed — kept
  deliberately minimal here.
