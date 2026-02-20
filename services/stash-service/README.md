# Linkpouch Stash Service

## Prerequisites

- mise (tool version manager)
- Docker & Docker Compose
- kubectl (for Kubernetes deployment)

## Setup

```bash
# Install tools via mise
mise install

# Start local infrastructure
docker-compose up -d postgres redis minio

# Run database migrations
cd infrastructure
mvn flyway:migrate

# Generate jOOQ code (REQUIRED before compiling)
mvn jooq-codegen:generate

# Build the project
cd ..
mvn clean package -DskipTests
```

## jOOQ Code Generation

This project uses jOOQ for type-safe SQL queries. The generated code is NOT committed to the repository.

### First Time Setup

After starting the database and running migrations, generate jOOQ classes:

```bash
cd services/stash-service/infrastructure
mvn jooq-codegen:generate
```

This will create classes in `target/generated-sources/jooq/`

### Regenerating jOOQ Code

If you modify the database schema, regenerate jOOQ classes:

```bash
# Run migrations first
mvn flyway:migrate

# Then regenerate
mvn jooq-codegen:generate
```

### Why Manual Code Generation?

jOOQ generates Java code from your actual database schema. This requires:
1. A running PostgreSQL instance
2. Migrated schema

The generated code is added to the source path during compilation via the build-helper-maven-plugin.

## Development Workflow

```bash
# 1. Start infrastructure
mise run dev

# 2. Run migrations
cd services/stash-service/infrastructure
mvn flyway:migrate

# 3. Generate jOOQ code
mvn jooq-codegen:generate

# 4. Build and run
cd ..
mvn spring-boot:run -pl infrastructure
```

## Testing

```bash
# Run all tests
mvn test

# Run only unit tests
mvn test -pl domain,application

# Run integration tests (requires database)
mvn test -pl infrastructure
```

## API Endpoints

- `POST /api/stashes` - Create stash
- `GET /api/stashes/{id}` - Get stash
- `POST /api/stashes/{id}/links` - Add link
- `GET /api/stashes/{id}/links` - List links
- `GET /api/stashes/{id}/links/search?q={query}` - Search links
- `DELETE /api/stashes/{id}/links/{linkId}` - Delete link

## Health Checks

- `/actuator/health` - Health status
- `/actuator/health/liveness` - Kubernetes liveness probe
- `/actuator/health/readiness` - Kubernetes readiness probe

## Architecture

See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
