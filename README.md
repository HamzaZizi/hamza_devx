# 📝 Todo App - Full Stack with CI/CD

A production-ready 3-tier todo application with frontend, backend API, PostgreSQL database, automated tests, and Harness CD deployment to Kubernetes.

## 📚 Table of Contents

- [Stack](#stack)
- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Testing](#testing)
- [Docker Compose](#docker-compose)
- [Harness Deployment](#harness-deployment)
- [Project Structure](#project-structure)

---

## 🛠 Stack

- **Frontend**: HTML/CSS/JS served by nginx (proxies `/api/*` to backend)
- **Backend**: Node.js + Express REST API
- **Database**: PostgreSQL 16
- **Migrations**: Liquibase
- **Container Registry**: Docker Hub
- **Orchestration**: Kubernetes (EKS)
- **CI/CD**: Harness

---

## ⚡ Quick Start

### Run Locally (Without Docker)

```bash
./local/start.sh
```

Opens: http://localhost:8080/local/index-local.html

Stop:
```bash
./local/stop.sh
```

**Prerequisites:**
- PostgreSQL: `brew install postgresql@16`
- Node.js: `brew install node`

### Run with Docker Compose

```bash
docker compose up --build
```

Opens: http://localhost:8080

Includes: Frontend + Backend + PostgreSQL + Liquibase migrations

---

## 💻 Local Development

### Backend Development

```bash
cd backend
npm install
npm start        # Runs on http://localhost:3000
npm test         # Run unit tests
```

**API Endpoints:**
- `GET /health` - Health check
- `GET /api/todos` - List all todos
- `POST /api/todos` - Create todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo

### Frontend Development

```bash
cd frontend
npx http-server -p 8080
```

Access: http://localhost:8080/local/index-local.html

### Database Setup (Local)

```bash
# Create database
createdb todo_db

# Create user
psql postgres -c "CREATE USER todo_user WITH PASSWORD 'todo_pass';"

# Run migrations
psql todo_db -f local/setup-db.sql
```

---

## 🧪 Testing

### Backend Tests (21 tests)

```bash
cd backend
npm install
npm test
```

**Coverage:**
- API routes (CRUD operations)
- Error handling
- Database mocking
- Server configuration

### Frontend Tests (20 tests)

```bash
cd frontend
npm install
npm test
```

**Coverage:**
- DOM manipulation
- API calls (mocked)
- Event handlers
- Form validation
- Error states

### Run All Tests

```bash
# Backend
cd backend && npm ci && npm test

# Frontend
cd frontend && npm ci && npm test
```

**Total: 41 tests passing ✅**

---

## 🐳 Docker Compose

Runs the full stack locally with Docker:

```bash
docker compose up --build
```

**What it does:**
1. Starts PostgreSQL database
2. Runs Liquibase migrations
3. Starts backend API (Node.js)
4. Starts frontend (nginx)

**Access:**
- Frontend: http://localhost:8080
- Backend: http://localhost:3000/health
- Database: localhost:5432 (todo_user/todo_pass)

**Stop:**
```bash
docker compose down
docker compose down -v  # Also remove volumes
```

---

## 🚀 Harness Deployment

### Project Structure

```
harness-deploy/
├── backend/
│   ├── values.yaml              # Variables: image, replicas, env vars
│   └── manifests/
│       └── Deployment.yaml      # K8s template (ConfigMap, Secret, Deployment, Service)
├── frontend/
│   ├── values.yaml
│   └── manifests/
│       └── Deployment.yaml
└── database/
    ├── values.yaml
    └── manifests/
        └── Deployment.yaml
```

### Prerequisites

**AWS:**
- EKS cluster running
- `kubectl` configured to access cluster
- Namespace created: `kubectl create namespace todo-app`

**Docker Hub:**
- Images already built and pushed via Harness CI:
  - `<your-dockerhub>/todo-backend:latest`
  - `<your-dockerhub>/todo-frontend:latest`
  - `postgres:16-alpine` (public image)

**Harness:**
- Connected to your Kubernetes cluster
- Docker Hub connector configured
- Secrets created (see below)

### Step 1: Create Harness Secrets

Harness → Secrets → New Secret → Text Secret

**Required Secret:**
- **Name:** `todo_db_password`
- **Value:** Your database password (e.g., `SecurePassword123!`)

### Step 2: Create Services

Create 3 services in Harness:

#### 1. **todo-backend**
- **Service Type:** Kubernetes
- **Manifest Type:** K8s Manifest
- **Manifest Path:** `harness-deploy/backend/manifests/Deployment.yaml`
- **Values YAML:** `harness-deploy/backend/values.yaml`
- **Artifact Source:** Docker Hub
- **Image:** `<your-dockerhub>/todo-backend`
- **Tag:** `latest` (or `<+pipeline.sequenceId>`)

#### 2. **todo-frontend**
- **Manifest Path:** `harness-deploy/frontend/manifests/Deployment.yaml`
- **Values YAML:** `harness-deploy/frontend/values.yaml`
- **Artifact Source:** Docker Hub
- **Image:** `<your-dockerhub>/todo-frontend`
- **Tag:** `latest`

#### 3. **todo-database**
- **Manifest Path:** `harness-deploy/database/manifests/Deployment.yaml`
- **Values YAML:** `harness-deploy/database/values.yaml`
- **Artifact Source:** Docker Hub (public)
- **Image:** `postgres`
- **Tag:** `16-alpine`

### Step 3: Create Environment & Infrastructure

**Environment:**
- Name: `dev-todo-app`
- Type: Pre-Production

**Infrastructure Definition:**
- Name: `eks-todo-cluster`
- Type: Kubernetes Direct
- Connector: Your EKS connector
- Namespace: `todo-app`

### Step 4: Create Deployment Pipeline

Create pipeline: `todo-app-deploy`

**Stage 1: Deploy Database**
```yaml
- stage:
    name: Deploy Database
    type: Deployment
    spec:
      service:
        serviceRef: todo-database
      environment:
        environmentRef: dev-todo-app
        infrastructureDefinitions:
          - identifier: eks-todo-cluster
      execution:
        steps:
          - step:
              type: K8sRollingDeploy
              name: Deploy Postgres
```

**Stage 2: Deploy Backend**
```yaml
- stage:
    name: Deploy Backend
    type: Deployment
    spec:
      service:
        serviceRef: todo-backend
      environment:
        environmentRef: dev-todo-app
      execution:
        steps:
          - step:
              type: K8sRollingDeploy
              name: Deploy Backend
```

**Stage 3: Deploy Frontend**
```yaml
- stage:
    name: Deploy Frontend
    type: Deployment
    spec:
      service:
        serviceRef: todo-frontend
      environment:
        environmentRef: dev-todo-app
      execution:
        steps:
          - step:
              type: K8sRollingDeploy
              name: Deploy Frontend
```

### Step 5: Update values.yaml with Your Docker Hub Images

Edit these files with your Docker Hub username:

**`harness-deploy/backend/values.yaml`:**
```yaml
image: <your-dockerhub>/todo-backend:<+pipeline.sequenceId>
```

**`harness-deploy/frontend/values.yaml`:**
```yaml
image: <your-dockerhub>/todo-frontend:<+pipeline.sequenceId>
```

**`harness-deploy/database/values.yaml`:**
```yaml
image: postgres:16-alpine  # No change needed
```

### Step 6: Deploy

Run the deployment pipeline in Harness!

### Step 7: Access Your App

```bash
# Get the LoadBalancer URL
kubectl get svc -n todo-app

# Look for the frontend service EXTERNAL-IP
# Open: http://<EXTERNAL-IP>
```

### Harness Variables Used

The `values.yaml` files use these Harness expressions:

| Variable | Description | Example |
|----------|-------------|---------|
| `<+service.name>` | Service name | `todo-backend` |
| `<+artifact.image>` | Full image path | `dockerhub.io/user/todo-backend:123` |
| `<+artifact.imagePullSecret>` | Docker registry secret | (auto-injected) |
| `<+infra.namespace>` | K8s namespace | `todo-app` |
| `<+pipeline.sequenceId>` | Build number | `123` |
| `<+secrets.getValue("todo_db_password")>` | Database password | (from Harness secrets) |
| `<+variable.devx_username>` | Optional per-user suffix | `hamza` |

### Troubleshooting

**Check pods:**
```bash
kubectl get pods -n todo-app
kubectl logs -n todo-app <pod-name>
kubectl describe pod -n todo-app <pod-name>
```

**Common issues:**
- **ImagePullBackOff** → Check Docker Hub connector & image names
- **CrashLoopBackOff** → Check logs: `kubectl logs -n todo-app <pod-name>`
- **Pending** → Check PVC storage class (database)
- **Service not accessible** → Check LoadBalancer provisioning

**Database connection issues:**
Backend should connect to `postgres:5432` (service name)

---

## 📁 Project Structure

```
todo-app/
├── backend/                     # Node.js Express API
│   ├── src/
│   │   ├── server.js           # Main server
│   │   ├── db.js               # PostgreSQL connection
│   │   ├── routes/
│   │   │   └── todos.js        # CRUD endpoints
│   │   └── __tests__/          # Unit tests (Jest)
│   ├── package.json
│   ├── package-lock.json
│   └── Dockerfile
│
├── frontend/                    # Static HTML/CSS/JS
│   ├── index.html              # Main page
│   ├── app.js                  # Frontend logic
│   ├── style.css               # Modern gradient UI
│   ├── __tests__/              # Unit tests (Jest + jsdom)
│   ├── nginx.conf              # Proxies /api to backend
│   ├── package.json
│   ├── package-lock.json
│   └── Dockerfile
│
├── db/                          # Database migrations
│   ├── changelog/
│   │   └── changes/
│   │       └── 001-create-todos-table.yaml
│   └── Dockerfile              # Liquibase image
│
├── local/                       # Local dev scripts (gitignored)
│   ├── start.sh                # Start everything locally
│   ├── stop.sh                 # Stop all services
│   ├── setup-db.sql            # Database schema
│   ├── index-local.html        # Local frontend
│   └── app-local.js            # Points to localhost:3000
│
├── k8s/                         # Plain Kubernetes manifests
│   ├── 00-configmap-secret.yaml
│   ├── 01-postgres.yaml
│   ├── 02-liquibase-job.yaml
│   ├── 03-backend.yaml
│   └── 04-frontend.yaml
│
├── harness-deploy/              # Harness-specific manifests
│   ├── backend/
│   │   ├── values.yaml
│   │   └── manifests/Deployment.yaml
│   ├── frontend/
│   │   ├── values.yaml
│   │   └── manifests/Deployment.yaml
│   └── database/
│       ├── values.yaml
│       └── manifests/Deployment.yaml
│
├── docker-compose.yml           # Local stack with Docker
├── .gitignore                   # Ignores local/, node_modules/
└── README.md                    # This file
```

---

## 🔐 Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `todo_db` | Database name |
| `DB_USER` | `todo_user` | Database user |
| `DB_PASSWORD` | `todo_pass` | Database password |

### Frontend

No environment variables needed. Backend URL is configured in:
- **Production:** `nginx.conf` proxies `/api` to `backend:3000`
- **Local:** `local/app-local.js` points to `http://localhost:3000`

---

## 🎯 Features

✅ Full CRUD API for todos  
✅ Modern gradient UI with animations  
✅ Health checks and probes  
✅ Database migrations with Liquibase  
✅ Comprehensive unit tests (41 tests)  
✅ Docker Compose for local testing  
✅ Kubernetes manifests (plain + Harness)  
✅ Per-user deployments support  
✅ Secrets management via Harness  
✅ CI/CD ready with Harness  

---

## 📝 Notes

### What Goes to Git

✅ **Committed:**
- Source code (backend/, frontend/, db/)
- Tests (__tests__/)
- Dockerfiles
- K8s manifests (k8s/, harness-deploy/)
- package.json & package-lock.json
- Documentation

❌ **Gitignored:**
- `local/` folder (local dev only)
- `node_modules/` (installed via npm)
- `*.log`, `*.pid` (temporary files)

### Docker vs Local Development

| Feature | Local (`./local/start.sh`) | Docker Compose |
|---------|---------------------------|----------------|
| **Speed** | Fast (no build) | Slower (builds images) |
| **Database** | Native PostgreSQL | Containerized |
| **Hot reload** | ✅ Yes | ❌ No (rebuild needed) |
| **Networking** | localhost | Docker network |
| **Use case** | Development | Testing production setup |

### CI/CD Flow

```
Git Push → Harness CI (build images) → Docker Hub → Harness CD → EKS
                ↓                          ↓              ↓
           Run tests                 Push images     Deploy pods
```

---

## 🤝 Contributing

1. Make changes locally: `./local/start.sh`
2. Run tests: `npm test` (in backend/ and frontend/)
3. Commit and push to GitHub
4. Harness CI builds Docker images
5. Harness CD deploys to Kubernetes

---

## 📄 License

MIT

---

## 🆘 Support

**Issues?**
- Check logs: `kubectl logs -n todo-app <pod-name>`
- Verify secrets: Harness → Secrets → `todo_db_password`
- Database connection: Backend connects to `postgres:5432`
- LoadBalancer: `kubectl get svc -n todo-app`

**Local development issues?**
- Ensure PostgreSQL is running: `brew services list`
- Check ports: `lsof -ti:3000 -ti:8080`
- Clear cache: `rm -rf node_modules && npm install`
