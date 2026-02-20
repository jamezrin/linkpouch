# Linkpouch Kubernetes Deployment Guide

## Cluster Information

- **Platform**: arm64 (ARM64/AArch64)
- **Orchestrator**: k3s (Kubernetes 1.35)
- **Nodes**: 2 (1 control-plane, 1 worker)
- **Namespace**: `linkpouch-dev`

## Container Registry

Images are automatically built and pushed to **GitHub Container Registry (GHCR)** via GitHub Actions:

- `ghcr.io/jamezrin/linkpouch/stash-service`
- `ghcr.io/jamezrin/linkpouch/indexer-service`
- `ghcr.io/jamezrin/linkpouch/api-gateway`

### Image Tags

- `latest` - Latest build from main branch
- `sha-<short-sha>` - Specific commit
- `<branch-name>` - Branch-specific builds

## Deployment from GHCR

### 1. Create GitHub Container Registry Secret

Create a Kubernetes secret for pulling images from GHCR:

```bash
# Create a GitHub Personal Access Token with 'read:packages' scope
# Then create the secret:
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<your-github-token> \
  --docker-email=<your-email> \
  -n linkpouch-dev
```

### 2. Deploy All Services

```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/stash-service/
kubectl apply -f k8s/indexer-service/
kubectl apply -f k8s/api-gateway/

# Verify deployment
kubectl get pods -n linkpouch-dev
kubectl get services -n linkpouch-dev
```

### 3. Update Images to Latest

```bash
# Restart deployments to pull latest images
kubectl rollout restart deployment/stash-service -n linkpouch-dev
kubectl rollout restart deployment/indexer-service -n linkpouch-dev
kubectl rollout restart deployment/api-gateway -n linkpouch-dev
```

## Accessing Services

Port-forward for local access:

```bash
# API Gateway (recommended entry point)
kubectl port-forward svc/api-gateway 8080:80 -n linkpouch-dev

# Stash Service (direct access)
kubectl port-forward svc/stash-service 8080:80 -n linkpouch-dev

# Indexer Service (direct access)
kubectl port-forward svc/indexer-service 8081:80 -n linkpouch-dev
```

## Troubleshooting

### ImagePullBackOff / ErrImagePull

If pods fail to pull images:

1. Verify the GHCR secret exists:
   ```bash
   kubectl get secret ghcr-secret -n linkpouch-dev
   ```

2. Check that images exist in GHCR:
   ```bash
   # View available packages at:
   # https://github.com/jamezrin/linkpouch/pkgs/container/linkpouch%2Fstash-service
   ```

3. Update the secret if token expired:
   ```bash
   kubectl delete secret ghcr-secret -n linkpouch-dev
   # Recreate with new token
   ```

### Database Connection Issues

PostgreSQL is deployed as a StatefulSet with headless service. Connection string:

```
jdbc:postgresql://postgres:5432/linkpouch
```

### Redis Connection Issues

Redis is deployed as a Deployment with ClusterIP service:

```
redis://redis:6379/0
```

## Local Development (Alternative)

For local development without GHCR, you can load images directly:

### Option 1: Load Images into k3s

```bash
# From build machine:
docker save stash-service:latest > stash-service.tar
docker save indexer-service:latest > indexer-service.tar
docker save api-gateway:latest > api-gateway.tar

# Copy to k3s nodes and import:
scp stash-service.tar indexer-service.tar api-gateway.tar root@NODE_IP:/tmp/
ssh root@NODE_IP "k3s ctr images import /tmp/stash-service.tar"
ssh root@NODE_IP "k3s ctr images import /tmp/indexer-service.tar"
ssh root@NODE_IP "k3s ctr images import /tmp/api-gateway.tar"
```

### Option 2: Build Natively on k3s Nodes

```bash
ssh root@10.0.0.172

# Install dependencies (if not present)
apk add --no-cache git maven docker

# Clone and build
git clone https://github.com/jamezrin/linkpouch.git /tmp/linkpouch
cd /tmp/linkpouch/services/stash-service

# Build images directly on arm64 node
docker build -t stash-service:latest .
docker build -t indexer-service:latest ../indexer-service

# Import to containerd
k3s ctr images import <(docker save stash-service:latest)
k3s ctr images import <(docker save indexer-service:latest)
```

## Next Steps

1. ✅ **Set up GitHub Actions** - Images auto-build on push to main
2. ✅ **Configure GHCR secret** - Allow k3s to pull images
3. **Deploy services** - Apply Kubernetes manifests
4. **Set up Ingress** - Configure external access

## Architecture

```
┌─────────────────────────────────────────┐
│           k3s Cluster (arm64)           │
│  ┌─────────────┐    ┌─────────────┐    │
│  │  ocvm-a1-1  │    │  ocvm-a1-2  │    │
│  │  (master)   │    │   (worker)  │    │
│  └──────┬──────┘    └──────┬──────┘    │
│         │                  │            │
│  ┌──────┴──────────────────┴──────┐     │
│  │      linkpouch-dev namespace   │     │
│  │                                │     │
│  │  ┌─────────────────────────┐   │     │
│  │  │   PostgreSQL (pod)      │   │     │
│  │  │   Port: 5432            │   │     │
│  │  └─────────────────────────┘   │     │
│  │                                │     │
│  │  ┌─────────────────────────┐   │     │
│  │  │   Redis (pod)           │   │     │
│  │  │   Port: 6379            │   │     │
│  │  └─────────────────────────┘   │     │
│  │                                │     │
│  │  ┌─────────────────────────┐   │     │
│  │  │   Stash Service (pod)   │   │     │
│  │  │   Port: 8080            │   │     │
│  │  └─────────────────────────┘   │     │
│  │                                │     │
│  │  ┌─────────────────────────┐   │     │
│  │  │   Indexer Service (pod) │   │     │
│  │  │   Port: 8081            │   │     │
│  │  └─────────────────────────┘   │     │
│  │                                │     │
│  │  ┌─────────────────────────┐   │     │
│  │  │   API Gateway (pod)     │   │     │
│  │  │   Port: 8080            │   │     │
│  │  └─────────────────────────┘   │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

## GitHub Actions Workflows

The repository includes automated CI/CD:

- **`.github/workflows/build-container.yml`** - Reusable workflow for building containers
- **`.github/workflows/build-stash-service.yml`** - Builds stash-service on changes
- **`.github/workflows/build-indexer-service.yml`** - Builds indexer-service on changes
- **`.github/workflows/build-api-gateway.yml`** - Builds api-gateway on changes
- **`.github/workflows/build-all.yml`** - Builds all services (manual trigger or main branch)

Images are automatically tagged with:
- `latest` for main branch builds
- Git SHA for traceability
- Branch name for feature branches
