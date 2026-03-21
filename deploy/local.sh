#!/usr/bin/env bash
# deploy/local.sh — rebuild and restart services for local development.
#
# Usage:
#   ./deploy/local.sh              # rebuild everything
#   ./deploy/local.sh frontend     # rebuild frontend only
#   ./deploy/local.sh stash        # rebuild stash-service only (includes Maven)
#   ./deploy/local.sh api-gateway  # rebuild api-gateway only (includes Maven)

set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-all}"

build_stash() {
  echo "==> Building stash-service JAR (mvn clean package -DskipTests)..."
  (cd services/stash-service && mvn clean package -DskipTests -B -q)
  echo "==> Building stash-service Docker image..."
  docker-compose build stash-service
}

build_api_gateway() {
  echo "==> Building api-gateway JAR (mvn clean package -DskipTests)..."
  (cd services/api-gateway && mvn clean package -DskipTests -B -q)
  echo "==> Building api-gateway Docker image..."
  docker-compose build api-gateway
}

build_frontend() {
  echo "==> Building frontend Docker image..."
  docker-compose build frontend
}

case "$TARGET" in
  stash)
    build_stash
    docker-compose up -d stash-service
    ;;
  api-gateway)
    build_api_gateway
    docker-compose up -d api-gateway
    ;;
  frontend)
    build_frontend
    docker-compose up -d frontend
    ;;
  all)
    build_stash
    build_api_gateway
    build_frontend
    docker-compose up -d
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Valid targets: all | stash | api-gateway | frontend"
    exit 1
    ;;
esac

echo "==> Done. Waiting for health checks..."
docker-compose ps
