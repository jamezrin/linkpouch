# Linkpouch

A modern link bookmarking application with anonymous stashes, full-text search, page previews, and AI-generated summaries.

## Features

- **Anonymous stashes** — Create a private bookmark collection without an account. Access is controlled by a signed URL (HMAC-SHA256); no login required.
- **Full-text search** — PostgreSQL FTS with weighted `tsvector` (title/description/URL/content) and trigram fallback for substring matches.
- **Async metadata & screenshots** — Playwright-based scraper extracts page title, description, favicon, and takes screenshots in the background via Redis Streams.
- **AI Summary** — Every link gets an AI-generated structured summary (key takeaways, main content, notable details). Supports OpenRouter (free built-in tier + BYOK), OpenAI, Anthropic, and OpenCode. API keys are encrypted at rest with AES-256-GCM.
- **Three preview modes** — Switch between Live iframe, Archive snapshot (Wayback Machine), and AI Summary via a tab bar. Mode preference is remembered across links.
- **Folders** — Organise links into nested folders; create, rename, move, and delete from the sidebar. Bulk import supports folder targeting.
- **Revisit** — Re-fetches the screenshot and refreshes the AI summary for a link in one click.
- **Drag-and-drop reordering** — Reorder links with `@dnd-kit`; supports multi-select group dragging.
- **Archive.org integration** — Snapshot picker with year navigation, CDX proxy to avoid CORS.
- **Account linking** — Optionally sign in with GitHub, Google, Discord, or X to attach stashes to an account and access them across devices. Manage linked stashes at `/account`.
- **Stash URL rotation** — Regenerate the signed URL to invalidate old shared links.
- **Password protection** — Optionally restrict access to a stash with a password.
- **Screenshot refresh** — Request a new screenshot on demand, individually or in bulk.
- **What's New** — In-app changelog modal with an unseen-indicator badge. Seen state is persisted in `localStorage`.

## Quick Start

```bash
# Install tools (Java 21, Maven 3.9, Node 22, Python 3.13)
mise install

# Copy and configure environment variables
cp .env.example .env
# Edit .env — set GITHUB_CLIENT_ID/SECRET, AI_INCLUDED_API_KEY, AI_ENCRYPTION_KEY, etc.

# Start all infrastructure and services (Atlas migrations run automatically)
docker-compose up -d

# Build the stash service
cd services/stash-service
mise exec java -- mvn clean package -DskipTests
```

The frontend is served by Vite on `http://localhost:5173` and the API Gateway is on `http://localhost:8080`.

> **IDE / local dev (outside Docker):** Run `mise run migrate` after `docker-compose up -d` to apply migrations and regenerate jOOQ sources against the running database.

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
  │  18         │◀─────────│  (link events)      │
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
| **Stash Service** | Java 21 / Spring Boot 4.0.1 | 8081 | Core API, DDD + Hexagonal Architecture |
| **Indexer Service** | Python 3.13 / FastAPI | 8082 | Async scraping via Playwright + Redis consumer |
| **Frontend** | React 19 / Vite 8 | 5173 | Single-page app |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend language | Java 21, Python 3.13 |
| Web frameworks | Spring Boot 4.0.1, FastAPI |
| Frontend | React 19, Vite 8, TypeScript 5.6, Tailwind CSS v4 |
| Database | PostgreSQL 18 (FTS + trigram indexes) |
| Migrations | Atlas |
| ORM / query | JPA (writes), jOOQ 3.20 (reads / FTS) |
| Events | Redis 8 Streams |
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
├── infrastructure-persistence/       # JPA entities, jOOQ queries, Atlas migrations
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
| `PATCH` | `/api/stashes/{id}` | Update stash (rename, password, visibility) |
| `DELETE` | `/api/stashes/{id}` | Delete stash |
| `POST` | `/api/stashes/{id}/rotate-signature` | Regenerate signed URL |

### Link endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/stashes/{id}/links` | Add a link |
| `GET` | `/api/stashes/{id}/links` | List links (paginated, optional `search` param) |
| `PATCH` | `/api/stashes/{id}/links` | Reorder links |
| `DELETE` | `/api/stashes/{id}/links/{linkId}` | Delete a link |
| `POST` | `/api/stashes/{id}/links/{linkId}/reindex` | Re-scrape and refresh AI summary |

### Account endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/account` | Get account info |
| `GET` | `/api/account/stashes` | List stashes claimed by the account |
| `POST` | `/api/account/stashes/{id}/claim` | Claim a stash |
| `DELETE` | `/api/account/stashes/{id}/claim` | Disown a stash |
| `GET` | `/api/account/ai-settings` | Get AI provider settings |
| `PUT` | `/api/account/ai-settings` | Upsert AI provider settings |
| `GET` | `/api/account/ai-settings/models?provider=` | List available models for a provider |

### Utility endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/embeddable-check?url=` | Check if URL can be iframed |
| `GET` | `/api/wayback/cdx` | Proxied Wayback Machine CDX API (avoids CORS) |

Internal indexer callback endpoints (`PATCH /links/*/metadata`, `PATCH /links/*/screenshot`, `PATCH /links/*/status`, `GET /stashes/*/ai-credentials`) are blocked at the API Gateway and only callable within the cluster.

## Security

- **Signed URL access control** — HMAC-SHA256 with a stash-specific secret + master key. The signature is stored in `sessionStorage` after the first visit; the URL is rewritten to `/s/{id}` so the signature never appears in browser history.
- **No stash enumeration** — There is no `GET /stashes` endpoint. Stashes are only accessible via their signed URL.
- **Encrypted AI API keys** — User-provided API keys are encrypted at rest with AES-256-GCM via a JPA attribute converter. The encryption key is never stored alongside the data.
- **AI credentials pull model** — The indexer never receives API keys via Redis Streams. It fetches credentials at processing time from an internal stash-service endpoint (`GET /stashes/{id}/ai-credentials`), which is blocked at the gateway and requires a shared `X-Indexer-Secret` header.
- **SSRF protection** — Both the stash service (`infrastructure-http`) and the indexer (`scraper.py`) block requests to loopback, private (RFC1918), link-local, CGNAT, and multicast addresses.
- **Gateway firewall** — Internal indexer callbacks and the AI credentials endpoint are blocked at the API Gateway (HTTP 403). Only in-cluster services can reach them.
- **Constant-time comparison** — Signatures are verified with `MessageDigest.isEqual` to prevent timing attacks.

## Database Schema

```sql
-- stashes
id UUID PRIMARY KEY, name TEXT, secret_key TEXT, password_hash TEXT,
visibility TEXT, version INTEGER, signature_refreshed_at,
created_at, updated_at

-- links
id UUID PRIMARY KEY, stash_id UUID REFERENCES stashes(id) ON DELETE CASCADE,
folder_id UUID REFERENCES folders(id),
url TEXT, title TEXT, description TEXT, favicon_url TEXT,
page_content TEXT, final_url TEXT, screenshot_key TEXT,
position INTEGER,  -- drag-and-drop order
status TEXT,       -- PENDING, PROCESSING, DONE, FAILED
ai_summary TEXT, ai_summary_status TEXT, ai_summary_model TEXT,
search_vector tsvector GENERATED ALWAYS AS (  -- weighted FTS
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B') ||
    ...
) STORED,
created_at, updated_at

-- folders
id UUID PRIMARY KEY, stash_id UUID REFERENCES stashes(id) ON DELETE CASCADE,
parent_id UUID REFERENCES folders(id), name TEXT, position INTEGER,
created_at, updated_at

-- accounts
id UUID PRIMARY KEY, email TEXT, display_name TEXT, avatar_url TEXT,
created_at, updated_at

-- account_providers  (OAuth identities)
id UUID PRIMARY KEY, account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
provider TEXT, provider_user_id TEXT,
UNIQUE (provider, provider_user_id)

-- account_stashes  (claimed stashes)
account_id UUID, stash_id UUID, claimed_at,
PRIMARY KEY (account_id, stash_id)

-- account_ai_settings
account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
provider TEXT, api_key TEXT (AES-256-GCM encrypted), model TEXT,
custom_prompt TEXT, created_at, updated_at
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
# Copy and fill in environment variables (OAuth2 keys, AI key, etc.)
cp .env.example .env

# Start infrastructure (postgres, redis, seaweedfs) + all app services
# Atlas migrations run automatically via the atlas-migrate service
docker-compose up -d

# Build stash service
cd services/stash-service
mise exec java -- mvn clean package -DskipTests

# Install and run frontend
cd frontend
npm install
npm run dev
```

> To run stash-service from an IDE (outside Docker), also run `mise run migrate` to apply migrations and regenerate jOOQ sources.

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

## Changelog

User-visible changes are documented in `frontend/src/changelog.ts`. When shipping a feature or notable fix, add a new entry at the top of the `changelog` array and increment `LATEST_VERSION`. The modal in the app header will show an unseen-indicator badge to users who haven't read it yet.

See `AGENTS.md` → "Releasing User-Visible Changes" for the exact steps.

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
