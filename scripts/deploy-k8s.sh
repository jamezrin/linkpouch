#!/bin/bash
set -e

# Deploy script for Linkpouch to Kubernetes (arm64 cluster)

NAMESPACE="linkpouch-dev"
REGISTRY="${REGISTRY:-localhost}"
VERSION="${VERSION:-latest}"

echo "Deploying Linkpouch to Kubernetes..."
echo "Namespace: $NAMESPACE"
echo "Registry: $REGISTRY"
echo "Version: $VERSION"

# Check if cluster is accessible
echo ""
echo "=== Checking Kubernetes Cluster ==="
kubectl cluster-info
kubectl get nodes -o wide

# Deploy infrastructure first
echo ""
echo "=== Deploying Infrastructure ==="
kubectl apply -f k8s/namespace.yaml

# Deploy PostgreSQL
echo ""
echo "Deploying PostgreSQL..."
kubectl apply -f k8s/postgres/configmap.yaml
kubectl apply -f k8s/postgres/secret.yaml
kubectl apply -f k8s/postgres/statefulset.yaml
kubectl apply -f k8s/postgres/service.yaml

# Deploy Redis
echo ""
echo "Deploying Redis..."
kubectl apply -f k8s/redis/deployment.yaml
kubectl apply -f k8s/redis/service.yaml

# Wait for infrastructure to be ready
echo ""
echo "=== Waiting for Infrastructure ==="
kubectl rollout status statefulset/postgres -n $NAMESPACE --timeout=120s || true
kubectl rollout status deployment/redis -n $NAMESPACE --timeout=60s || true

# Deploy applications
echo ""
echo "=== Deploying Applications ==="

# Update image references in deployments
if [ "$REGISTRY" != "localhost" ]; then
    echo "Updating image references..."
    sed -i "s|image: stash-service:latest|image: $REGISTRY/stash-service:$VERSION|g" k8s/stash-service/deployment.yaml
    sed -i "s|image: indexer-service:latest|image: $REGISTRY/indexer-service:$VERSION|g" k8s/indexer-service/deployment.yaml
fi

# Deploy Stash Service
echo ""
echo "Deploying Stash Service..."
kubectl apply -f k8s/stash-service/secret.yaml
kubectl apply -f k8s/stash-service/deployment.yaml
kubectl apply -f k8s/stash-service/service.yaml

# Deploy Indexer Service
echo ""
echo "Deploying Indexer Service..."
kubectl apply -f k8s/indexer-service/deployment.yaml
kubectl apply -f k8s/indexer-service/service.yaml

# Wait for applications
echo ""
echo "=== Waiting for Applications ==="
kubectl rollout status deployment/stash-service -n $NAMESPACE --timeout=180s || true
kubectl rollout status deployment/indexer-service -n $NAMESPACE --timeout=180s || true

# Show status
echo ""
echo "=== Deployment Status ==="
kubectl get pods -n $NAMESPACE -o wide
kubectl get services -n $NAMESPACE

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Services:"
echo "  - Stash Service: kubectl port-forward svc/stash-service 8080:80 -n $NAMESPACE"
echo "  - Indexer Service: kubectl port-forward svc/indexer-service 8081:80 -n $NAMESPACE"
echo ""
echo "Check logs:"
echo "  - Stash Service: kubectl logs -f deployment/stash-service -n $NAMESPACE"
echo "  - Indexer Service: kubectl logs -f deployment/indexer-service -n $NAMESPACE"
