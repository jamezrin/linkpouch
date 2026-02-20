# Linkpouch Stash Service

## Prerequisites

- mise (tool version manager) - see [mise installation](https://mise.jdx.dev/getting-started.html)
- Docker & Docker Compose
- kubectl (for Kubernetes deployment)

## Setup

### 1. Install Tools via mise

```bash
# Install all tools (Java 21, Maven 3.9, Node 22, Python 3.13)
mise install

# Verify Java version
mise exec java -- java -version  # Should show Java 21
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, MinIO
docker-compose up -d postgres redis minio

# Wait for PostgreSQL to be ready
docker-compose exec postgres pg_isready -U linkpouch
```

### 3. Database Setup

```bash
cd services/stash-service/infrastructure

# Run migrations
mise exec java -- mvn flyway:migrate

# Generate jOOQ code (REQUIRED before compiling)
mise exec java -- mvn jooq-codegen:generate
```

### 4. Build the Project

```bash
cd services/stash-service

# Install parent modules first
mise exec java -- mvn install -DskipTests -pl domain,application

# Compile everything (after jOOQ generation)
mise exec java -- mvn compile

# Or build the full package
mise exec java -- mvn package -DskipTests
```

## jOOQ Code Generation

**IMPORTANT**: This project uses ACTUAL jOOQ code generation from a live database schema. The generated code is NOT committed to the repository.

### First Time Setup

After starting the database and running migrations, generate jOOQ classes:

```bash
cd services/stash-service/infrastructure
mise exec java -- mvn jooq-codegen:generate
```

This will create classes in `target/generated-sources/jooq/`

### Regenerating jOOQ Code

If you modify the database schema:

```bash
# 1. Run migrations first
cd services/stash-service/infrastructure
mise exec java -- mvn flyway:migrate

# 2. Regenerate jOOQ code
mise exec java -- mvn jooq-codegen:generate
```

### Why Manual Code Generation?

jOOQ generates Java code from your actual database schema. This requires:
1. A running PostgreSQL instance
2. Migrated schema

The generated code is added to the source path during compilation via the build-helper-maven-plugin.

**Note**: Running `mvn clean` will delete generated jOOQ code. You'll need to regenerate it.

## Development Workflow

### Using mise tasks

```bash
# Start infrastructure
mise run dev

# Run migrations and generate jOOQ
cd services/stash-service/infrastructure
mise exec java -- mvn flyway:migrate jooq-codegen:generate

# Build and run
cd ..
mise exec java -- mvn spring-boot:run -pl infrastructure
```

### Full Clean Build

```bash
# If you run mvn clean, you MUST regenerate jOOQ code:
cd services/stash-service

# 1. Clean
mise exec java -- mvn clean

# 2. Regenerate jOOQ
cd infrastructure
mise exec java -- mvn jooq-codegen:generate
cd ..

# 3. Build
mise exec java -- mvn compile
```

## Testing

```bash
# Run all tests
mise exec java -- mvn test

# Run only unit tests
mise exec java -- mvn test -pl domain,application

# Run integration tests (requires database)
mise exec java -- mvn test -pl infrastructure
```

## API Endpoints

### Stash Management
- `POST /api/stashes` - Create stash
- `GET /api/stashes/{id}` - Get stash

### Link Management
- `POST /api/stashes/{id}/links` - Add link
- `GET /api/stashes/{id}/links` - List links
- `GET /api/stashes/{id}/links/search?q={query}` - Search links
- `DELETE /api/stashes/{id}/links/{linkId}` - Delete link
- `POST /api/stashes/{id}/links/{linkId}/refresh` - Refresh screenshot

## Health Checks

- `/actuator/health` - Health status
- `/actuator/health/liveness` - Kubernetes liveness probe
- `/actuator/health/readiness` - Kubernetes readiness probe
- `/actuator/metrics` - Application metrics
- `/actuator/prometheus` - Prometheus metrics

## Architecture

See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)

## Technology Stack

- **Java**: 21 (LTS)
- **Spring Boot**: 3.4.3
- **Architecture**: DDD + Hexagonal
- **Database**: PostgreSQL 16 with Full-Text Search
- **Persistence**: JPA (simple CRUD) + jOOQ (complex queries)
- **Migrations**: Flyway 11
- **Mapping**: MapStruct 1.6.3
- **Build**: Maven 3.9

## Troubleshooting

### Build fails with "package com.linkpouch.stash.infrastructure.jooq.generated does not exist"

You need to generate jOOQ code:
```bash
cd services/stash-service/infrastructure
mise exec java -- mvn jooq-codegen:generate
```

### "Cannot execute query. No JDBC Connection configured" during jOOQ generation

Make sure PostgreSQL is running:
```bash
docker-compose up -d postgres
docker-compose exec postgres pg_isready -U linkpouch
```

### Lombok errors

Make sure you're using Java 21 via mise:
```bash
mise exec java -- java -version
```

## License

MIT
