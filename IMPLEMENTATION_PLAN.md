# Linkpouch Implementation Plan v2

## Architecture: DDD + Hexagonal Architecture

### Tech Stack (Latest Versions)

#### Frontend
- React 19 + TypeScript 5.5
- Vite 6
- TanStack Query v5
- Tailwind CSS v4 + shadcn/ui
- React Router v7

#### Backend - Stash Service (Java 21)
- Spring Boot 3.4.x (latest patch) or 4.0.3
- Spring Boot Actuator (health checks, metrics from day one)
- jOOQ 3.19 (complex/native queries)
- JPA (Hibernate 6.6) - simple CRUD only
- Flyway 11 (database migrations)
- PostgreSQL 16 driver
- MapStruct 1.6.3 (DTO/entity mapping)
- Lombok 1.18.36 (boilerplate reduction)
- Redis Streams (async event publishing)

#### Backend - API Gateway (Java 21)
- Spring Boot 3.4.x
- Spring Cloud Gateway 4.2.x
- Spring Cloud 2024.0.3 (Moorgate)

#### Backend - Indexer Service (Python 3.13.x)
- FastAPI 0.115+
- Playwright 1.49+
- Celery 5.4+
- Redis Streams consumer
- httpx 0.28+

#### Infrastructure
- PostgreSQL 16
- Redis 7.4
- MinIO (latest)
- Kubernetes (deployed via kubectl to linkpouch-dev namespace)

### Development Tools
- mise (tool version manager) - manages Java, Maven, Node, Python versions
- Docker + Docker Compose (local development)

## Project Structure (Monorepo)

```
linkpouch/
├── .git/
├── README.md
├── IMPLEMENTATION_PLAN.md
├── docker-compose.yml              # Local development
├── Makefile                        # Common tasks
├── k8s/                            # Kubernetes manifests
│   ├── namespace.yaml
│   ├── postgres/
│   │   ├── configmap.yaml
│   │   ├── secret.yaml
│   │   ├── statefulset.yaml
│   │   └── service.yaml
│   ├── redis/
│   ├── minio/
│   ├── api-gateway/
│   ├── stash-service/
│   └── indexer-service/
├── services/
│   ├── api-gateway/               # Spring Boot - Routing & Auth
│   ├── stash-service/             # Spring Boot - DDD + Hexagonal
│   │   ├── domain/                # Core domain (ports, entities, value objects)
│   │   ├── application/           # Use cases, services
│   │   ├── infrastructure/        # Adapters (jOOQ, JPA, REST, etc.)
│   │   └── pom.xml
│   └── indexer-service/           # Python FastAPI
└── frontend/                      # React + Vite
```

## Hexagonal Architecture Structure (Stash Service)

```
stash-service/
├── domain/                        # Inner hexagon - pure business logic
│   ├── model/                     # Entities, Value Objects
│   ├── port/
│   │   ├── inbound/               # Driving ports (use cases)
│   │   └── outbound/              # Driven ports (repositories)
│   └── service/                   # Domain services
├── application/                   # Application layer
│   ├── dto/                       # Data transfer objects
│   ├── mapper/                    # DTO <-> Domain mapping (MapStruct)
│   └── service/                   # Application services (use cases + transaction boundaries)
├── infrastructure/                # Outer hexagon - adapters
│   ├── adapter/
│   │   ├── persistence/           # Repository adapters
│   │   │   ├── jpa/               # JPA repositories (simple CRUD)
│   │   │   └── jooq/              # jOOQ repositories (complex queries)
│   │   └── web/                   # REST controllers
│   ├── config/                    # Spring configurations
│   └── flyway/                    # Database migrations
└── pom.xml
```

## Database Migrations (Flyway)

Location: `stash-service/src/main/resources/db/migration/`

- `V1__create_stashes_table.sql`
- `V2__create_links_table.sql`
- `V3__create_search_indexes.sql`

## Implementation Phases

### Phase 1: Foundation + Architecture Setup (Week 1)
**Goal**: Hexagonal architecture foundation, database with migrations

1. **Project Setup**
   - [ ] Maven multi-module structure
   - [ ] Domain module (entities, ports)
   - [ ] Application module (use cases)
   - [ ] Infrastructure module (adapters)

2. **Database**
   - [ ] Flyway setup
   - [ ] Migration scripts (V1, V2, V3)
   - [ ] PostgreSQL StatefulSet in k8s
   - [ ] Deploy and test migrations

3. **Domain Layer**
   - [ ] Stash entity + value objects
   - [ ] Link entity + value objects
   - [ ] Repository ports
   - [ ] Use case ports

4. **Persistence Adapters**
   - [ ] JPA adapter for Stash (simple CRUD)
   - [ ] jOOQ configuration
   - [ ] jOOQ adapter for Link with FTS

### Phase 2: Stash Service Core (Week 2)
**Goal**: CRUD operations with URL signing

1. **Application Layer**
   - [ ] CreateStash use case
   - [ ] GetStash use case
   - [ ] AddLink use case
   - [ ] DeleteLink use case
   - [ ] SearchLinks use case (jOOQ FTS)

2. **URL Signing Service**
   - [ ] HMAC-SHA256 implementation
   - [ ] Signature validation
   - [ ] URL generation

3. **REST Adapters**
   - [ ] Controllers
   - [ ] DTOs
   - [ ] Exception handling

4. **Testing**
   - [ ] Unit tests (domain)
   - [ ] Integration tests (adapters)
   - [ ] Deploy to linkpouch-dev

### Phase 3: Frontend + API Gateway (Week 3)
**Goal**: Working UI with routing

1. **API Gateway**
   - [ ] Spring Cloud Gateway setup
   - [ ] Route configuration
   - [ ] CORS configuration
   - [ ] Deploy to k8s

2. **Frontend**
   - [ ] Vite + React setup
   - [ ] Landing page
   - [ ] Stash creation
   - [ ] Stash view (split layout)
   - [ ] Search functionality

3. **Integration**
   - [ ] End-to-end testing
   - [ ] Deploy frontend to Cloudflare

### Phase 4: Indexer Service (Week 4)
**Goal**: Link metadata extraction

1. **Indexer Service**
   - [ ] FastAPI setup
   - [ ] Playwright integration
   - [ ] Robots.txt checking
   - [ ] Celery + Redis setup

2. **Integration**
   - [ ] Async processing
   - [ ] Event publishing

### Phase 5: Screenshots + Polish (Week 5)
**Goal**: Screenshots and final touches

1. **Screenshots**
   - [ ] MinIO setup
   - [ ] Screenshot generation
   - [ ] Frontend preview panel

2. **Wayback Machine**
   - [ ] API integration

3. **Polish**
   - [ ] Error handling
   - [ ] Loading states
   - [ ] Mobile responsiveness

## Key Decisions

1. **Persistence Strategy**:
   - JPA: Stash CRUD operations
   - jOOQ: Link queries with FTS, native SQL features

2. **Migration Tool**: Flyway (better Gradle/Maven integration)

3. **Tool Version Management**: mise (https://mise.jdx.dev/)
   - Manages Java, Maven, Node.js, Python versions
   - Ensures consistent tooling across development environments
   - Configuration in `mise.toml` at repository root

4. **Module Structure**: Clear separation following hexagonal architecture

5. **Mapping Strategy**: MapStruct for all DTO/entity/domain object mapping
   - `mapIn`: Maps from external layer (JPA/jOOQ) TO domain
   - `mapOut`: Maps FROM domain TO external layer (JPA/DTO)
   - **EXPLICIT @Mapping annotations required** for every field, even with same names
   - Use MapStruct built-in features (nullValuePropertyMappingStrategy, defaultValue, etc.) to minimize manual code
   - This ensures IDE refactoring updates mappers automatically

6. **jOOQ Code Generation**: Use ACTUAL jOOQ codegen, NEVER fake/stub generated classes
   - Generated code is created from live database schema
   - Run `mvn jooq-codegen:generate` after migrations
   - Generated classes go to `target/generated-sources/jooq/`
   - NOT committed to repository
   - Build fails without generated code - this is intentional

7. **Code Generation**: Lombok for reducing boilerplate

8. **Transaction Boundaries**: Application layer only (services/use cases), never in adapters

9. **Git Workflow**: Commit after each milestone/feature

10. **Deployment**: kubectl apply to linkpouch-dev namespace for testing

## Inter-Service Communication (Redis Streams)

Stash Service → Indexer Service communication via Redis Streams:

**Producer (Stash Service)**:
- Publishes events to Redis Streams using `XADD`
- Events: `link.added`, `screenshot.refresh.requested`
- JSON payload with event metadata

**Consumer (Indexer Service)**:
- Consumer group pattern for horizontal scaling
- Acknowledges messages after processing
- Auto-retry with exponential backoff

**Stream Names**:
- `linkpouch:events:link` - Link indexing events
- `linkpouch:events:screenshot` - Screenshot generation events

**Benefits**:
- Persistent message queue (survives restarts)
- Consumer groups for parallel processing
- Back-pressure handling
- No message loss on consumer failure

## Latest Version References

- Spring Boot: 3.4.x (check maven central for latest)
- Spring Cloud: 2024.0.3 (Moorgate)
- jOOQ: 3.19.14
- Flyway: 11.0.0
- PostgreSQL: 16
- Python: 3.13.x
- React: 19.0.0
- Vite: 6.0.0
