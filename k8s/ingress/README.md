# Kubernetes Ingress Setup

This directory contains Kubernetes manifests for exposing Linkpouch via HTTPS.

## Prerequisites

1. **Traefik Ingress Controller** installed on your k3s cluster:
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.0/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml
   kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.0/docs/content/reference/dynamic-configuration/kubernetes-crd-rbac.yml
   ```

2. **Cert-Manager** for automatic TLS certificates:
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

## Configuration

### 1. Update Domain Name

Edit `ingress.yaml` and replace `linkpouch.example.com` with your actual domain:
```yaml
spec:
  rules:
    - host: your-domain.com
```

Also update `cluster-issuer.yaml` with your email:
```yaml
email: your-email@example.com
```

### 2. Deploy Ingress

```bash
# Apply middlewares first
kubectl apply -f k8s/ingress/middlewares.yaml

# Apply cluster issuer
kubectl apply -f k8s/ingress/cluster-issuer.yaml

# Apply certificate
kubectl apply -f k8s/ingress/certificate.yaml

# Apply ingress
kubectl apply -f k8s/ingress/ingress.yaml
```

## DNS Configuration

Point your domain's DNS A record to your k3s cluster's external IP:

```
your-domain.com  A  <your-k3s-node-ip>
```

Get your node IP:
```bash
kubectl get nodes -o wide
```

## Verification

Check ingress status:
```bash
kubectl get ingress -n linkpouch-dev
kubectl get certificate -n linkpouch-dev
```

Test HTTPS:
```bash
curl -v https://your-domain.com/health
```

## Components

- **Ingress**: Routes traffic to frontend and API gateway
- **Middlewares**: HTTPS redirect and rate limiting
- **ClusterIssuer**: Let's Encrypt for automatic TLS
- **Certificate**: TLS certificate for your domain

## Architecture

```
Internet
    ↓
Traefik (port 443)
    ↓
Ingress
    ├── / → Frontend (React app)
    └── /api → API Gateway
```
