# Linkpouch

A modern link bookmarking application with anonymous stashes, full-text search, and page previews.

## Features

- **Anonymous stashes** — Create a private bookmark collection without an account. Access is controlled by a signed URL (HMAC-SHA256); no login required.
- **Full-text search** — PostgreSQL FTS with weighted `tsvector` (title/description/URL/content) and trigram fallback for substring matches.
- **Async metadata & screenshots** — Playwright-based scraper extracts page title, description, favicon, and takes screenshots in the background via Redis Streams.
- **Drag-and-drop reordering** — Reorder links with `@dnd-kit`; supports multi-select group dragging.
- **Live preview panel** — Renders the linked page in a sandboxed iframe. Falls back automatically to Wayback Machine if the site blocks embedding (X-Frame-Options / CSP).
- **Archive.org integration** — Snapshot picker, CDX proxy to avoid CORS, and a live/archive toggle.
- **Stash rename** — Click the stash name inline to rename it.
- **Screenshot refresh** — Request a new screenshot on demand, individually or in bulk.

## Quick Start

```bash
# Install tools (Java 21, Maven 3.9, Node 22, Python 3.13)
mise install

# Start all infrastructure and services
docker-compose up -d

# Run Flyway migrations and generate jOOQ code (first run only)
mise run migrate

# Build the stash service
cd services/stash-service
mise exec java -- mvn clean package -DskipTests
```

The frontend is served by Vite on `http://localhost:5173` and the API Gateway is on `http://localhost:8080`.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│  React + Vite       │────▶│  API Gateway         │
│  (Frontend SPA)     │     │  (Spring Cloud GW)   │
└─────────────────────┘     └──────────┬───────────┘
                                       │
               ┌───────────────────────┤
               ▼                       ▼
  ┌────────────────────┐   ┌─────────────────────┐
  │  Stash Service     │   │  Indexer Service    │
  │  (Spring Boot)     │   │  (Python/FastAPI)   │
  └──────┬─────────────┘   └────────┬────────────┘
         │                          │
         ▼                          ▼
  ┌─────────────┐          ┌─────────────────────┐
  │  PostgreSQL │          │  Redis Streams      │
  │  16         │◀─────────│  (link events)      │
  └─────────────┘          └────────┬────────────┘
                                    │
                                    ▼
                           ┌─────────────────────┐
                           │  SeaweedFS / S3     │
                           │  (screenshots)      │
                           └─────────────────────┘
```

### Services

| Service | Stack | Port | Responsibility |
|---|---|---|---|
| **API Gateway** | Spring Cloud Gateway | 8080 | Routing, CORS, blocks internal endpoints |
| **Stash Service** | Java 21 / Spring Boot 3.4.3 | 8081 | Core API, DDD + Hexagonal Architecture |
| **Indexer Service** | Python 3.13 / FastAPI | 8082 | Async scraping via Playwright + Redis consumer |
| **Frontend** | React 19 / Vite 6 | 5173 | Single-page app |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend language | Java 21, Python 3.13 |
| Web frameworks | Spring Boot 3.4.3, FastAPI |
| Frontend | React 19, Vite 6, TypeScript 5.6, Tailwind CSS v4 |
| Database | PostgreSQL 16 (FTS + trigram indexes) |
| Migrations | Flyway 11 |
| ORM / query | JPA (writes), jOOQ 3.19 (reads / FTS) |
| Events | Redis 7.4 Streams |
| Object storage | SeaweedFS (S3-compatible) |
| Scraping | Playwright (Chromium) |
| Drag-and-drop | @dnd-kit |
| API spec | OpenAPI 3.0 (code-generated controllers + DTOs) |
| Mapping | MapStruct 1.6.3 |
| Infra | Kubernetes (k3s), Docker Compose |
| CI/CD | GitHub Actions → GHCR |

## Module Structure (Stash Service)

The stash service follows **Hexagonal Architecture** with four independent infrastructure modules:

```
stash-service/
├── api-spec/                   # OpenAPI YAML + code generation
├── domain/                     # Pure business logic (no framework deps)
│   ├── model/                  # Stash, Link, value objects
│   └── port/                   # Inbound + outbound port interfaces
├── application/                # Use cases, @Transactional boundaries
├── infrastructure-web/         # REST controllers (implements generated API)
├── infrastructure-redis/       # Redis Streams event publisher
├── infrastructure-persistence-jpa/   # JPA entities, Flyway migrations
├── infrastructure-persistence-jooq/  # jOOQ queries (FTS, pagination, reorder)
├── infrastructure-http/        # Outbound HTTP (embeddability check, SSRF protection)
├── infrastructure-sse/         # Server-Sent Events (real-time link status broadcasts)
└── boot/                       # Spring Boot entry point
```

Transaction boundaries live **only in the application layer**. Adapters never carry `@Transactional`.

## API Overview

All stash and link endpoints require an `X-Stash-Signature` header (HMAC-SHA256 over stash ID + stash secret + master key).

### Stash endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/stashes` | Create a stash; returns signed URL |
| `GET` | `/api/stashes/{id}` | Get stash details |
| `PATCH` | `/api/stashes/{id}` | Rename stash |
| `DELETE` | `/api/stashes/{id}` | Delete stash |

### Link endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/stashes/{id}/links` | Add a link |
| `GET` | `/api/stashes/{id}/links` | List links (paginated, optional `search` param) |
| `PATCH` | `/api/stashes/{id}/links` | Reorder links |
| `DELETE` | `/api/stashes/{id}/links/{linkId}` | Delete a link |
| `POST` | `/api/stashes/{id}/links/{linkId}/refresh-screenshot` | Request new screenshot |

### Utility endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/embeddable-check?url=` | Check if URL can be iframed |
| `GET` | `/api/wayback/cdx` | Proxied Wayback Machine CDX API (avoids CORS) |

Internal indexer callback endpoints (`PATCH /links/*/metadata`, `PATCH /links/*/screenshot`) are blocked at the API Gateway and only callable within the cluster.

## Security

- **Signed URL access control** — HMAC-SHA256 with a stash-specific secret + master key. The signature is stored in `sessionStorage` after the first visit; the URL is rewritten to `/s/{id}` so the signature never appears in browser history.
- **No stash enumeration** — There is no `GET /stashes` endpoint. Stashes are only accessible via their signed URL.
- **SSRF protection** — Both the stash service (`infrastructure-http`) and the indexer (`scraper.py`) block requests to loopback, private (RFC1918), link-local, CGNAT, and multicast addresses.
- **Gateway firewall** — Internal indexer callbacks are blocked at the API Gateway (HTTP 403). Only in-cluster services can reach them.
- **Constant-time comparison** — Signatures are verified with `MessageDigest.isEqual` to prevent timing attacks.

## Database Schema

```sql
-- stashes
id UUID PRIMARY KEY, name TEXT, secret_key TEXT, created_at, updated_at

-- links
id UUID PRIMARY KEY, stash_id UUID REFERENCES stashes(id) ON DELETE CASCADE,
url TEXT, title TEXT, description TEXT, favicon_url TEXT,
page_content TEXT, final_url TEXT, screenshot_key TEXT,
position INTEGER,  -- drag-and-drop order
search_vector tsvector GENERATED ALWAYS AS (  -- weighted FTS
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B') ||
    ...
) STORED,
created_at, updated_at
```

GIN index on `search_vector`, trigram indexes on `title` and `url` for substring fallback.

## Development

### Prerequisites

```bash
# Install mise (tool version manager)
curl https://mise.run | sh
source ~/.bashrc  # or restart your shell

# Install all required tools
mise install
```

### Running locally

```bash
# Start infrastructure (postgres, redis, seaweedfs) + all app services
docker-compose up -d

# First-time setup: run migrations
mise run migrate

# Build stash service
cd services/stash-service
mise exec java -- mvn clean package -DskipTests

# Install and run frontend
cd frontend
npm install
npm run dev
```

### Build commands

```bash
# Java — compile and test
cd services/stash-service
mise exec java -- mvn clean compile
mise exec java -- mvn test

# Python — install, lint, test
cd services/indexer-service
pip install -e ".[dev]"
black src/ tests/
ruff check src/ tests/
mypy src/
pytest
```

## CI/CD & Container Registry

Images are built on every push to `main` (multi-platform: `amd64`/`arm64`) and published to **GitHub Container Registry**:

- `ghcr.io/jamezrin/linkpouch/stash-service`
- `ghcr.io/jamezrin/linkpouch/indexer-service`
- `ghcr.io/jamezrin/linkpouch/api-gateway`
- `ghcr.io/jamezrin/linkpouch/frontend`

## Kubernetes Deployment

The cluster is managed via **ArgoCD** (`argocd.jamezrin.com`), which watches the `k8s/` directory on `main` and automatically syncs any changes. There is no need to apply manifests manually — pushing to `main` is sufficient.

The production setup includes: Traefik ingress with TLS (cert-manager), KEDA-based autoscaling for the indexer, and Spring Boot Actuator liveness/readiness probes.

## License

MIT
