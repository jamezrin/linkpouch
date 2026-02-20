# Linkpouch

A modern link bookmarking application with anonymous stashes, full-text search, and page previews.

## Quick Start

```bash
# Install tools (Java 21, Maven, Node, Python)
mise install

# Start infrastructure
docker-compose up -d postgres redis minio

# Setup stash-service (Java)
cd services/stash-service/infrastructure
mise exec java -- mvn flyway:migrate jooq-codegen:generate
cd ..
mise exec java -- mvn package -DskipTests

# Run services
mise exec java -- mvn spring-boot:run -pl infrastructure  # Stash Service on :8080
```

## Architecture

- **API Gateway** (Spring Cloud Gateway): Routing, load balancing, and CORS
- **Stash Service** (Java/Spring Boot): Core API with DDD + Hexagonal Architecture
- **Indexer Service** (Python/FastAPI): Async link scraping with Playwright
- **Frontend** (React/Vite): Modern UI

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Stash Service](services/stash-service/README.md)
- [Indexer Service](services/indexer-service/README.md)

## Tech Stack

- **Backend**: Java 21, Spring Boot 3.4.3, Python 3.13
- **Frontend**: React 19, Vite 6, TypeScript 5.5
- **Database**: PostgreSQL 16 with Full-Text Search
- **Cache/Queue**: Redis 7.4 (Streams)
- **Storage**: MinIO (S3-compatible)
- **Infra**: Kubernetes, Docker

## CI/CD & Container Registry

Images are automatically built and published to **GitHub Container Registry (GHCR)** via GitHub Actions:

- `ghcr.io/jamezrin/linkpouch/stash-service`
- `ghcr.io/jamezrin/linkpouch/indexer-service`
- `ghcr.io/jamezrin/linkpouch/api-gateway`

Workflows trigger on pushes to `main` branch and build multi-platform images (amd64/arm64).

## Development

See individual service READMEs for detailed setup instructions.

## License

MIT
