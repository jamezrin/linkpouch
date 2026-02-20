# Linkpouch Architecture Documentation

## Overview

Linkpouch is a link bookmarking application with anonymous stashes, full-text search, and page previews.

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  React + Vite   │────▶│  API Gateway     │
│  (Cloudflare)   │     │  (Spring Boot)   │
└─────────────────┘     └────────┬─────────┘
                                 │
         ┌───────────────────────┼───────────┐
         ▼                       ▼           ▼
┌─────────────────┐    ┌─────────────────┐  │
│  Stash Service  │    │  Indexer Service│  │
│  (Spring Boot)  │    │  (Python/FastAPI)│ │
└────────┬────────┘    └────────┬────────┘  │
         │                      │           │
         ▼                      ▼           ▼
┌─────────────────┐    ┌─────────────────┐  │
│  PostgreSQL     │    │  Redis Streams  │◀─┘
│  (Dedicated)    │    │                 │
└─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  MinIO/S3       │
                       │  (Screenshots)  │
                       └─────────────────┘
```

## Tech Stack

### Backend - Stash Service
- **Java**: 21 (managed via mise)
- **Spring Boot**: 3.4.3
- **Architecture**: DDD + Hexagonal Architecture
- **Persistence**: JPA (simple CRUD) + jOOQ (complex queries)
- **Database**: PostgreSQL 16 with Full-Text Search
- **Migrations**: Flyway 11
- **Mapping**: MapStruct 1.6.3 with explicit @Mapping annotations
- **Events**: Redis Streams
- **Monitoring**: Spring Boot Actuator

### Backend - Indexer Service
- **Python**: 3.13.x
- **Framework**: FastAPI
- **Scraping**: Playwright
- **Queue**: Redis Streams consumer
- **Task Processing**: Celery (optional)

### Infrastructure
- **Container Orchestration**: Kubernetes
- **Message Broker**: Redis 7.4 (Streams)
- **Object Storage**: MinIO
- **Development**: Docker Compose

## Module Structure (Stash Service)

### Domain Module (Inner Hexagon)
Pure business logic with no framework dependencies:
- **Entities**: `Stash`, `Link`
- **Value Objects**: `StashName`, `Url`, `SecretKey`, etc.
- **Ports**: Interfaces for driven and driving adapters

### Application Layer
Use case implementations with transaction boundaries:
- **Services**: `StashManagementService`, `LinkManagementService`
- **DTOs**: Request/response objects
- **Mappers**: MapStruct with `mapIn`/`mapOut` naming convention

### Infrastructure Module (Outer Hexagon)
Technical implementations:
- **Persistence Adapters**: JPA repositories, jOOQ queries
- **Web Adapters**: REST controllers
- **Event Adapters**: Redis Streams publisher

## Key Design Decisions

### 1. Hexagonal Architecture
- Clear separation between domain and infrastructure
- Domain has no external dependencies
- Adapters implement ports defined by domain

### 2. Transaction Boundaries
- **ONLY in application layer services**
- Adapters (persistence, web) have NO @Transactional annotations
- Ensures business logic controls transactions

### 3. Mapping Strategy (MapStruct)
- **Explicit @Mapping annotations** for every field
- Naming convention:
  - `mapIn`: Maps TO domain (from external layer)
  - `mapOut`: Maps FROM domain (to external layer)
- Ensures IDE refactoring updates mappers automatically
- Use `@Named` qualifiers for value object converters

### 4. Event-Driven Architecture
- Stash Service publishes events to Redis Streams
- Indexer Service consumes events asynchronously
- Decouples link indexing from API response time

### 5. Tool Version Management
- **mise** manages all tool versions (Java, Maven, Node, Python)
- Ensures consistent development environment
- Configuration in `mise.toml`

## Inter-Service Communication

### Redis Streams

**Producer (Stash Service)**:
```java
eventPublisher.publishLinkAdded(new LinkAddedEvent(linkId, url, stashId));
```

**Consumer (Indexer Service)**:
- Consumer group: `indexer-workers`
- Stream: `linkpouch:events:link`
- Acknowledges after processing
- Supports horizontal scaling

**Event Types**:
- `link.added`: New link added, needs metadata extraction
- `screenshot.refresh.requested`: Screenshot regeneration requested

## Development Workflow

### Prerequisites
```bash
# Install mise (tool version manager)
curl https://mise.run | sh

# Install tools
mise install
```

### Build
```bash
# Build all services
mise run build

# Or manually
cd services/stash-service
mvn clean package -DskipTests
```

### Local Development
```bash
# Start infrastructure
mise run dev

# Run migrations
mise run migrate

# Deploy to k8s dev namespace
mise run k8s-deploy
```

## Database Schema

### Stashes Table
```sql
CREATE TABLE stashes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    secret_key TEXT NOT NULL
);
```

### Links Table
```sql
CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stash_id UUID NOT NULL REFERENCES stashes(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    favicon_url TEXT,
    page_content TEXT,
    final_url TEXT,
    screenshot_key TEXT,
    screenshot_generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    search_vector tsvector GENERATED ALWAYS AS (...)
);
```

## API Endpoints

### Stash Management
- `POST /api/stashes` - Create new stash
- `GET /api/stashes/{id}` - Get stash (requires signature header)

### Link Management
- `POST /api/stashes/{stashId}/links` - Add link
- `GET /api/stashes/{stashId}/links` - List links
- `GET /api/stashes/{stashId}/links/search?q={query}` - Search links
- `DELETE /api/stashes/{stashId}/links/{linkId}` - Delete link
- `POST /api/stashes/{stashId}/links/{linkId}/refresh` - Refresh screenshot

## URL Signing

Format: `/s/{stash-id}/{signature}`

- **Algorithm**: HMAC-SHA256
- **Encoding**: Base64url (no padding)
- **Secret**: Stash-specific secret key + master key
- **Lifetime**: No expiration (stashes live forever)

## Monitoring

### Spring Boot Actuator Endpoints
- `/actuator/health` - Health checks
- `/actuator/health/liveness` - Kubernetes liveness probe
- `/actuator/health/readiness` - Kubernetes readiness probe
- `/actuator/metrics` - Application metrics
- `/actuator/prometheus` - Prometheus metrics

## Future Enhancements

1. **Stash Expiration**: Optional TTL for stashes
2. **Password Protection**: Optional password for sensitive stashes
3. **OAuth Integration**: Delegated authentication
4. **Rate Limiting**: Prevent abuse
5. **Backup Strategy**: Automated PostgreSQL backups
