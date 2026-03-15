# Runtime-only image — expects a pre-built Spring Boot JAR.
#
# Build the JAR first with Maven (requires a live PostgreSQL for jOOQ codegen;
# run 'atlas migrate apply --env local' before running jOOQ codegen):
#   atlas migrate apply --env local
#   mvn clean verify -B
#
# Then build the image:
#   docker build -t stash-service .

# ── Stage 1: Pull the Atlas binary ──────────────────────────────────────────
FROM arigaio/atlas:latest AS atlas-bin

# ── Stage 2: Runtime image ──────────────────────────────────────────────────
FROM eclipse-temurin:21.0.10_7-jre-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy Atlas binary so the same image can be used as a migration init container
COPY --from=atlas-bin /atlas /usr/local/bin/atlas

# Embed the Atlas migration files (used by the init container)
COPY infrastructure-persistence/src/main/resources/db/migrations /migrations

# Copy the Spring Boot executable JAR from the boot module
COPY boot/target/*.jar app.jar

# Create non-root user
RUN addgroup -S linkpouch && adduser -S linkpouch -G linkpouch
USER linkpouch

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
