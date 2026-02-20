# Linkpouch Kubernetes Deployment Guide

## Cluster Information

- **Platform**: arm64 (ARM64/AArch64)
- **Orchestrator**: k3s (Kubernetes 1.35)
- **Nodes**: 2 (1 control-plane, 1 worker)
- **Namespace**: `linkpouch-dev`

## Current Status

✅ **Infrastructure Deployed**:
- PostgreSQL 16 (StatefulSet) - Running
- Redis 7 (Deployment) - Running

⚠️ **Application Images Need Loading**:
- stash-service:latest - Built for arm64
- indexer-service:latest - Built for arm64

The images are built locally but need to be loaded into the k3s cluster.

## Deployment Options

### Option 1: Load Images into k3s (Recommended for Development)

Since the cluster nodes run k3s, you need to load the Docker images into the containerd runtime:

```bash
# On each k3s node (ocvm-a1-1 and ocvm-a1-2), run:
k3s ctr images import - < stash-service.tar
k3s ctr images import - < indexer-service.tar
```

To export and import:

```bash
# From build machine:
docker save stash-service:latest > stash-service.tar
docker save indexer-service:latest > indexer-service.tar

# Copy to k3s nodes and import:
scp stash-service.tar indexer-service.tar root@NODE_IP:/tmp/
ssh root@NODE_IP "k3s ctr images import /tmp/stash-service.tar"
ssh root@NODE_IP "k3s ctr images import /tmp/indexer-service.tar"
```

### Option 2: Push to a Container Registry

Push images to a registry accessible by the cluster:

```bash
# Tag for your registry
docker tag stash-service:latest your-registry.com/linkpouch/stash-service:latest
docker tag indexer-service:latest your-registry.com/linkpouch/indexer-service:latest

# Push
docker push your-registry.com/linkpouch/stash-service:latest
docker push your-registry.com/linkpouch/indexer-service:latest

# Update k8s manifests to use the registry image
sed -i 's|image: stash-service:latest|image: your-registry.com/linkpouch/stash-service:latest|g' k8s/stash-service/deployment.yaml
sed -i 's|image: indexer-service:latest|image: your-registry.com/linkpouch/indexer-service:latest|g' k8s/indexer-service/deployment.yaml
```

### Option 3: Build Natively on k3s Nodes

SSH into a k3s node and build the images there:

```bash
ssh root@10.0.0.172

# Install dependencies (if not present)
apk add --no-cache git maven docker

# Clone and build
git clone <repo-url> /tmp/linkpouch
cd /tmp/linkpouch/services/stash-service

# Build images directly on arm64 node
docker build -t stash-service:latest .
docker build -t indexer-service:latest ../indexer-service

# Import to containerd
k3s ctr images import <(docker save stash-service:latest)
k3s ctr images import <(docker save indexer-service:latest)
```

## Current Deployments

Check current status:

```bash
kubectl get pods -n linkpouch-dev
kubectl get services -n linkpouch-dev
```

## Accessing Services

Port-forward for local access:

```bash
# Stash Service
kubectl port-forward svc/stash-service 8080:80 -n linkpouch-dev

# Indexer Service
kubectl port-forward svc/indexer-service 8081:80 -n linkpouch-dev
```

## Troubleshooting

### ErrImagePull

The pods are failing with `ErrImagePull` because the images are not in the k3s containerd storage. Use one of the options above to load them.

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

## Next Steps

1. **Load Images**: Choose one of the 3 options above to get the images into k3s
2. **Restart Pods**: After loading images, the pods should automatically start
3. **Test**: Use port-forwarding to test the APIs
4. **Ingress**: Set up an Ingress for external access

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
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```
