# Linkpouch Stash Service

Core API service for managing anonymous stashes and bookmarks. Built with Spring Boot 3.4.3 and follows Hexagonal Architecture.

## Prerequisites

- mise (tool version manager) - see [mise installation](https://mise.jdx.dev/getting-started.html)
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)
- Redis 7.4 (via Docker)

## Quick Start

```bash
# 1. Install tools (Java 21, Maven 3.9)
mise install

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Apply migrations and generate jOOQ code (first run only)
atlas migrate apply --env local
mise exec java -- mvn jooq-codegen:generate -pl infrastructure-persistence

# 4. Build and run
cd services/stash-service
mise exec java -- mvn clean package -DskipTests
mise exec java -- mvn spring-boot:run -pl boot
```

The service runs on `http://localhost:8081` (behind API Gateway on port 8080).

## Module Structure

Following **Hexagonal Architecture** with strict dependency direction: `domain` ← `application` ← `infrastructure-*`

```
stash-service/
├── api-spec/                    # OpenAPI 3.0 specs + generated DTOs/controllers
├── domain/                      # Pure business logic (no framework deps)
│   ├── model/                   # Stash, Link, value objects
│   └── port/                    # Inbound/outbound port interfaces
├── application/                 # Use cases, transaction boundaries
│   └── service/                 # Domain services with @Transactional
├── infrastructure-persistence/  # JPA entities + jOOQ queries + Atlas migrations
├── infrastructure-redis/        # Redis Streams event publisher
├── infrastructure-http/         # Outbound HTTP client (embeddability, SSRF protection)
├── infrastructure-web/          # REST controllers (implements OpenAPI spec)
├── infrastructure-sse/          # Server-Sent Events (real-time link status)
└── boot/                        # Spring Boot application entry point
```

### Infrastructure Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `infrastructure-persistence` | JPA entities, repositories (writes), jOOQ queries (reads/FTS), Atlas migrations |
| `infrastructure-redis` | Redis Streams publisher for link indexing events |
| `infrastructure-http` | Outbound HTTP with SSRF protection, embeddability checks |
| `infrastructure-web` | REST controllers implementing generated OpenAPI interfaces |
| `infrastructure-sse` | Server-Sent Events for real-time link status updates |
| `boot` | Spring Boot auto-configuration, component scanning |

## Build Commands

```bash
cd services/stash-service

# Compile only
mise exec java -- mvn clean compile

# Build package (skip tests)
mise exec java -- mvn clean package -DskipTests

# Run all tests (requires PostgreSQL)
mise exec java -- mvn test

# Run single test class
mise exec java -- mvn test -Dtest=StashTest

# Run single test method
mise exec java -- mvn test -Dtest=StashTest#createStash

# Run tests for specific module
mise exec java -- mvn test -pl domain

# Full build with tests and verification
mise exec java -- mvn clean verify -B

# Format code (Spotless + palantir-java-format)
mise exec java -- mvn spotless:apply

# Check formatting without modifying
mise exec java -- mvn spotless:check
```

## Database Migrations (Atlas)

This project uses **Atlas** for schema migrations (not Flyway).

```bash
# Apply pending migrations to local DB
atlas migrate apply --env local

# Create a new blank migration file
atlas migrate new --env local <name>

# Recalculate atlas.sum after editing migrations
atlas migrate hash --env local

# Check migration status
atlas migrate status --env local
```

Migrations live in: `infrastructure-persistence/src/main/resources/db/migrations/`

## jOOQ Code Generation

**IMPORTANT**: jOOQ generates Java code from the live database schema. Generated code is NOT committed.

```bash
# 1. Ensure DB is running and migrations are applied
atlas migrate apply --env local

# 2. Generate jOOQ classes
mise exec java -- mvn jooq-codegen:generate -pl infrastructure-persistence
```

Generated code goes to: `infrastructure-persistence/src/main/generated/`

**Note**: `mvn clean` deletes generated code. You must regenerate after cleaning.

### Troubleshooting jOOQ

| Error | Solution |
|-------|----------|
| `package com.linkpouch.stash.infrastructure.jooq.generated does not exist` | Run jOOQ generation: `mvn jooq-codegen:generate -pl infrastructure-persistence` |
| `No JDBC Connection configured` during generation | Start PostgreSQL: `docker-compose up -d postgres` |
| Build fails after `mvn clean` | Regenerate jOOQ code (see above) |

## Development Workflow

### Run from IDE

1. Start infrastructure: `docker-compose up -d postgres redis`
2. Apply migrations: `atlas migrate apply --env local`
3. Generate jOOQ: `mise exec java -- mvn jooq-codegen:generate -pl infrastructure-persistence`
4. Import Maven project in IntelliJ/Eclipse
5. Run `boot/src/main/java/com/linkpouch/stash/StashServiceApplication.java`

### Full Clean Build

```bash
cd services/stash-service

# 1. Clean everything
mise exec java -- mvn clean

# 2. Regenerate jOOQ
mise exec java -- mvn jooq-codegen:generate -pl infrastructure-persistence

# 3. Build
mise exec java -- mvn compile
```

## API Endpoints

All endpoints require `X-Stash-Signature` header (HMAC-SHA256).

### Stash Management
- `POST /api/stashes` - Create stash (returns signed URL)
- `GET /api/stashes/{id}` - Get stash details
- `PATCH /api/stashes/{id}` - Rename stash
- `DELETE /api/stashes/{id}` - Delete stash

### Link Management
- `POST /api/stashes/{id}/links` - Add link
- `GET /api/stashes/{id}/links` - List links (paginated, `?search=` for FTS)
- `PATCH /api/stashes/{id}/links` - Reorder links (drag-and-drop)
- `DELETE /api/stashes/{id}/links/{linkId}` - Delete link
- `POST /api/stashes/{id}/links/{linkId}/refresh-screenshot` - Request new screenshot

### Utility Endpoints
- `GET /api/embeddable-check?url=` - Check if URL can be iframed
- `GET /api/wayback/cdx` - Proxied Wayback Machine CDX API

### Internal Endpoints (blocked at Gateway)
- `PATCH /api/links/{id}/metadata` - Indexer callback for metadata
- `PATCH /api/links/{id}/screenshot` - Indexer callback for screenshots

## Health Checks

- `GET /actuator/health` - Health status
- `GET /actuator/health/liveness` - Kubernetes liveness probe
- `GET /actuator/health/readiness` - Kubernetes readiness probe
- `GET /actuator/metrics` - Application metrics
- `GET /actuator/prometheus` - Prometheus metrics

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Language** | Java 21 (LTS) |
| **Framework** | Spring Boot 3.4.3 |
| **Architecture** | DDD + Hexagonal |
| **Database** | PostgreSQL 16 |
| **Migrations** | Atlas |
| **Persistence** | JPA (writes) + jOOQ 3.19 (reads/FTS) |
| **Events** | Redis 7.4 Streams |
| **API Spec** | OpenAPI 3.0 (code-generated) |
| **Mapping** | MapStruct 1.6.3 |
| **Build** | Maven 3.9 |
| **Format** | Spotless + palantir-java-format |

## Testing

```bash
# Run all tests (requires running PostgreSQL)
mise exec java -- mvn test

# Run only unit tests (domain + application)
mise exec java -- mvn test -pl domain,application

# Run integration tests only
mise exec java -- mvn test -pl infrastructure-persistence,infrastructure-web,boot

# Run with coverage
mise exec java -- mvn verify -P coverage
```

### Test Naming Convention

- Test class: `*Test` (e.g., `StashTest`)
- Test method: `shouldDoSomethingWhenCondition()`
- Use Given-When-Then comments in test bodies

## Code Style

Enforced by **Spotless** with `palantir-java-format`:

- 4 spaces indentation (no tabs)
- Opening brace on same line
- 100 character line length
- No wildcard imports (except `lombok.*`)
- Import order: `java.*, javax.*, jakarta.*, org.*, com.*, com.linkpouch.*`
- Use `var` for local variables when type is obvious
- Records for DTOs
- `Optional<T>` for nullable returns

**Always run before committing:**
```bash
mise exec java -- mvn spotless:apply
```

## Troubleshooting

### Build fails with missing jOOQ classes

```bash
# Regenerate jOOQ code
mise exec java -- mvn jooq-codegen:generate -pl infrastructure-persistence
```

### Lombok errors

Ensure you're using Java 21 via mise:
```bash
mise exec java -- java -version  # Should show Java 21
```

### Atlas migration errors

Make sure PostgreSQL is running and accessible:
```bash
docker-compose up -d postgres
docker-compose exec postgres pg_isready -U linkpouch
```

### Circular dependency errors

Check that infrastructure modules don't depend on each other. The only valid dependencies are:
- `infrastructure-*` → `application`
- `application` → `domain`
- `boot` → all infrastructure modules

## Architecture Guidelines

See [AGENTS.md](../../AGENTS.md) for detailed coding standards.

Key principles:
1. **Transaction boundaries only in application layer** - Never in adapters/infrastructure
2. **No circular dependencies** - Infrastructure modules are independent
3. **Generated code not committed** - jOOQ and OpenAPI code is generated at build time
4. **Use @Mapping annotations** - All MapStruct mappers must explicitly map every field
5. **Never use fully qualified class names** - Always use imports

## License

MIT
