# 🚀 Harness Deployment Guide

This guide shows you how to deploy the Todo App to AWS EKS using Harness CD.

## 📁 Project Structure

```
todo-app/
├── harness-deploy/              ← NEW! Harness-specific manifests
│   ├── backend/
│   │   ├── values.yaml          ← Harness variables
│   │   └── manifests/
│   │       └── Deployment.yaml  ← Go template
│   ├── frontend/
│   │   ├── values.yaml
│   │   └── manifests/
│   │       └── Deployment.yaml
│   └── database/
│       ├── values.yaml
│       └── manifests/
│           └── Deployment.yaml
├── k8s/                         ← Original plain K8s files (keep for reference)
└── ...
```

## Step 1: AWS Setup

### 1.1 Verify EKS Cluster

```bash
# List your clusters
aws eks list-clusters --region <your-region>

# Update kubeconfig
aws eks update-kubeconfig --region <your-region> --name <cluster-name>

# Verify connection
kubectl get nodes
```

### 1.2 Create ECR Repositories

```bash
# Set your region
REGION=us-east-1  # Change to your region

# Create repositories
aws ecr create-repository --repository-name todo-backend --region $REGION
aws ecr create-repository --repository-name todo-frontend --region $REGION
aws ecr create-repository --repository-name todo-liquibase --region $REGION

# Get your ECR URIs
aws ecr describe-repositories --region $REGION --query 'repositories[*].[repositoryName,repositoryUri]' --output table
```

**Save these URIs! You'll need them:**
```
123456789012.dkr.ecr.us-east-1.amazonaws.com/todo-backend
123456789012.dkr.ecr.us-east-1.amazonaws.com/todo-frontend
123456789012.dkr.ecr.us-east-1.amazonaws.com/todo-liquibase
```

### 1.3 Create Kubernetes Namespace

```bash
kubectl create namespace todo-app
```

## Step 2: Harness Setup

### 2.1 Create Services in Harness

Go to Harness → Services → New Service

**Create 3 services:**

1. **todo-backend**
   - Service Type: Kubernetes
   - Manifest Type: K8s Manifest
   - Manifest Location: `harness-deploy/backend/manifests/`
   - Values YAML: `harness-deploy/backend/values.yaml`
   - Artifact: ECR → `<account-id>.dkr.ecr.<region>.amazonaws.com/todo-backend`

2. **todo-frontend**
   - Service Type: Kubernetes
   - Manifest Location: `harness-deploy/frontend/manifests/`
   - Values YAML: `harness-deploy/frontend/values.yaml`
   - Artifact: ECR → `<account-id>.dkr.ecr.<region>.amazonaws.com/todo-frontend`

3. **todo-database**
   - Service Type: Kubernetes
   - Manifest Location: `harness-deploy/database/manifests/`
   - Values YAML: `harness-deploy/database/values.yaml`
   - Artifact: DockerHub → `postgres:16-alpine` (no build needed)

### 2.2 Create Environment

Harness → Environments → New Environment

- Name: `dev-todo-app` (or `prod-todo-app`)
- Environment Type: Pre-Production (or Production)

### 2.3 Create Infrastructure

In your Environment → Infrastructure Definitions → New Infrastructure

- Name: `eks-todo-cluster`
- Deployment Type: Kubernetes
- Connector: Your EKS Kubernetes Connector
- Namespace: `todo-app`
- Release Name: `<+INFRA_KEY>`

### 2.4 Create Secrets

Harness → Secrets → New Secret → Text Secret

Create this secret:
- **Name:** `todo_db_password`
- **Value:** Choose a strong password (e.g., `MySecurePassword123!`)

### 2.5 Create Variable (Optional)

If you want per-user deployments:

Harness → Variables → New Variable
- **Name:** `devx_username`
- **Type:** String
- **Default Value:** `default`

## Step 3: Build Docker Images

### 3.1 Create Build Pipeline in Harness

Harness → Pipelines → New Pipeline → "todo-app-build"

Add 3 stages:

#### **Stage 1: Build Backend**
```yaml
- step:
    type: BuildAndPushECR
    name: Build Backend
    identifier: build_backend
    spec:
      connectorRef: <your-aws-connector>
      region: <your-region>
      account: <your-account-id>
      imageName: todo-backend
      tags:
        - latest
        - <+pipeline.sequenceId>
      dockerfile: backend/Dockerfile
      context: backend
```

#### **Stage 2: Build Frontend**
```yaml
- step:
    type: BuildAndPushECR
    name: Build Frontend
    identifier: build_frontend
    spec:
      connectorRef: <your-aws-connector>
      region: <your-region>
      account: <your-account-id>
      imageName: todo-frontend
      tags:
        - latest
        - <+pipeline.sequenceId>
      dockerfile: frontend/Dockerfile
      context: frontend
```

#### **Stage 3: Build Liquibase**
```yaml
- step:
    type: BuildAndPushECR
    name: Build Liquibase
    identifier: build_liquibase
    spec:
      connectorRef: <your-aws-connector>
      region: <your-region>
      account: <your-account-id>
      imageName: todo-liquibase
      tags:
        - latest
        - <+pipeline.sequenceId>
      dockerfile: db/Dockerfile
      context: db
```

**Run this pipeline to build all images!**

## Step 4: Create Deployment Pipeline

Harness → Pipelines → New Pipeline → "todo-app-deploy"

### Pipeline Stages:

#### **Stage 1: Deploy Database**
```yaml
- stage:
    name: Deploy Database
    identifier: deploy_database
    type: Deployment
    spec:
      deploymentType: Kubernetes
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
              identifier: deploy_postgres
              spec:
                skipDryRun: false
```

#### **Stage 2: Run Liquibase Migration**
```yaml
- stage:
    name: Run DB Migration
    identifier: db_migration
    type: Deployment
    spec:
      deploymentType: Kubernetes
      service:
        serviceRef: todo-liquibase
      environment:
        environmentRef: dev-todo-app
        infrastructureDefinitions:
          - identifier: eks-todo-cluster
      execution:
        steps:
          - step:
              type: K8sApply
              name: Apply Migration Job
              identifier: migration_job
              spec:
                filePaths:
                  - k8s/02-liquibase-job.yaml
                skipDryRun: false
          - step:
              type: K8sDelete
              name: Delete Job After Complete
              identifier: cleanup_job
              spec:
                deleteResources:
                  type: ReleaseName
                  spec:
                    deleteNamespace: false
```

#### **Stage 3: Deploy Backend**
```yaml
- stage:
    name: Deploy Backend
    identifier: deploy_backend
    type: Deployment
    spec:
      deploymentType: Kubernetes
      service:
        serviceRef: todo-backend
        serviceInputs:
          serviceDefinition:
            type: Kubernetes
            spec:
              artifacts:
                primary:
                  primaryArtifactRef: <+input>
                  sources: <+input>
      environment:
        environmentRef: dev-todo-app
        infrastructureDefinitions:
          - identifier: eks-todo-cluster
      execution:
        steps:
          - step:
              type: K8sRollingDeploy
              name: Deploy Backend
              identifier: deploy_backend
              spec:
                skipDryRun: false
```

#### **Stage 4: Deploy Frontend**
```yaml
- stage:
    name: Deploy Frontend
    identifier: deploy_frontend
    type: Deployment
    spec:
      deploymentType: Kubernetes
      service:
        serviceRef: todo-frontend
        serviceInputs:
          serviceDefinition:
            type: Kubernetes
            spec:
              artifacts:
                primary:
                  primaryArtifactRef: <+input>
                  sources: <+input>
      environment:
        environmentRef: dev-todo-app
        infrastructureDefinitions:
          - identifier: eks-todo-cluster
      execution:
        steps:
          - step:
              type: K8sRollingDeploy
              name: Deploy Frontend
              identifier: deploy_frontend
              spec:
                skipDryRun: false
```

## Step 5: Deploy!

1. **Run Build Pipeline** → Builds all 3 Docker images
2. **Run Deploy Pipeline** → Deploys to EKS

## Step 6: Access Your App

```bash
# Get the LoadBalancer URL
kubectl get svc -n todo-app

# Look for frontend service with EXTERNAL-IP
# Open: http://<EXTERNAL-IP>
```

## 🔍 Troubleshooting

### Check Deployment Status
```bash
kubectl get pods -n todo-app
kubectl get svc -n todo-app
kubectl logs -n todo-app <pod-name>
```

### Check Harness Variables
Make sure these are set:
- `<+artifact.image>` → Comes from Service artifact
- `<+infra.namespace>` → Set in Infrastructure (todo-app)
- `<+secrets.getValue("todo_db_password")>` → Created in Secrets
- `<+variable.devx_username>` → Optional, defaults to "default"

### Common Issues

1. **ImagePullBackOff** → Check ECR permissions
2. **CrashLoopBackOff** → Check pod logs
3. **Service not accessible** → Check LoadBalancer provisioning

## 📊 Key Differences from Plain K8s

| Feature | Plain K8s (`k8s/`) | Harness (`harness-deploy/`) |
|---------|-------------------|------------------------------|
| **Variables** | Hardcoded | Go templates with `<+variable>` |
| **Secrets** | Manual K8s secrets | Harness secret manager |
| **Image refs** | Placeholders | `<+artifact.image>` |
| **Multi-env** | Multiple files | Same files, different values |
| **Per-user** | Not supported | `sename` variable support |

## 🎯 Next Steps

- Set up CI/CD trigger on git push
- Add automated tests before deployment
- Configure rollback strategies
- Set up monitoring and alerts
- Add multiple environments (dev, staging, prod)
