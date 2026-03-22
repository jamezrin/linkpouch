# ── Stage 1: Pull the Atlas binary ──────────────────────────────────────────
FROM arigaio/atlas:latest AS atlas-bin

# ── Stage 2: Build the Spring Boot JAR ──────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

COPY . .

# BuildKit cache mount keeps the local Maven repository between builds.
# jOOQ codegen is skipped — generated sources are committed to the repo.
RUN --mount=type=cache,target=/root/.m2 \
    mvn package -DskipTests -Djooq.codegen.skip=true -B

# ── Stage 3: Runtime image ───────────────────────────────────────────────────
FROM eclipse-temurin:25.0.2_10-jre-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy Atlas binary so the same image can be used as a migration init container
COPY --from=atlas-bin /atlas /usr/local/bin/atlas

# Embed the Atlas migration files (used by the init container)
COPY infrastructure-persistence/src/main/resources/db/migrations /migrations

# Copy the Spring Boot executable JAR from the builder
COPY --from=builder /app/boot/target/*.jar app.jar

# Create non-root user
RUN addgroup -S linkpouch && adduser -S linkpouch -G linkpouch
USER linkpouch

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
