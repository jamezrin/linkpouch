#!/bin/bash
set -e

# Build script for Linkpouch services with multi-arch support (arm64)

REGISTRY="${REGISTRY:-localhost}"
VERSION="${VERSION:-latest}"
PLATFORM="${PLATFORM:-linux/arm64}"

echo "Building Linkpouch services..."
echo "Registry: $REGISTRY"
echo "Version: $VERSION"
echo "Platform: $PLATFORM"

# Build Stash Service
echo ""
echo "=== Building Stash Service ==="
cd services/stash-service

# Ensure jOOQ code is generated
if [ ! -d "infrastructure/target/generated-sources/jooq" ]; then
    echo "ERROR: jOOQ code not generated. Run: cd infrastructure && mvn jooq-codegen:generate"
    exit 1
fi

# Build for arm64
docker buildx build \
    --platform $PLATFORM \
    -t $REGISTRY/stash-service:$VERSION \
    -t $REGISTRY/stash-service:latest \
    --load \
    .

cd ../..

# Build Indexer Service
echo ""
echo "=== Building Indexer Service ==="
cd services/indexer-service

# Install dependencies and build
docker buildx build \
    --platform $PLATFORM \
    -t $REGISTRY/indexer-service:$VERSION \
    -t $REGISTRY/indexer-service:latest \
    --load \
    .

cd ../..

echo ""
echo "=== Build Complete ==="
echo "Images built:"
echo "  - $REGISTRY/stash-service:$VERSION"
echo "  - $REGISTRY/indexer-service:$VERSION"
