# Deployment

## Local development

Use `deploy/local.sh` to rebuild and restart services. Always use this script instead of calling `docker-compose build` directly for Java services.

```bash
./deploy/local.sh              # rebuild everything
./deploy/local.sh stash        # rebuild stash-service only
./deploy/local.sh api-gateway  # rebuild api-gateway only
./deploy/local.sh frontend     # rebuild frontend only
```

### Why not `docker-compose build` directly?

The Java service Dockerfiles (`stash-service`, `api-gateway`) are **runtime-only images** — they `COPY` a pre-built JAR from `target/` rather than running Maven inside Docker. This keeps image builds fast, but means the JAR on disk must be up-to-date before `docker-compose build` is invoked.

**The stale image trap:** If you edit Java source files and run `docker-compose build stash-service` without first rebuilding the JAR, Docker will silently package the old JAR. `--no-cache` does not help — it forces Docker to re-examine layers, but the copied file is still the old one. The resulting image runs old code with no warning.

`deploy/local.sh` prevents this by always running `mvn clean package -DskipTests` before `docker-compose build` for Java services.

### Prerequisites

- PostgreSQL must be running before building `stash-service` (jOOQ codegen connects to the live DB). Start it with `docker-compose up -d postgres` if needed.
- `mise` must be active (Java 21, Maven 3.9, Node 22).
