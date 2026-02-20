# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy parent POM first
COPY pom.xml .
COPY api-spec/pom.xml api-spec/
COPY domain/pom.xml domain/
COPY application/pom.xml application/
COPY infrastructure-persistence-jpa/pom.xml infrastructure-persistence-jpa/
COPY infrastructure-persistence-jooq/pom.xml infrastructure-persistence-jooq/
COPY infrastructure-redis/pom.xml infrastructure-redis/
COPY infrastructure-web/pom.xml infrastructure-web/
COPY boot/pom.xml boot/

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY api-spec/src api-spec/src
COPY domain/src domain/src
COPY application/src application/src
COPY infrastructure-persistence-jpa/src infrastructure-persistence-jpa/src
COPY infrastructure-persistence-jooq/src infrastructure-persistence-jooq/src
COPY infrastructure-redis/src infrastructure-redis/src
COPY infrastructure-web/src infrastructure-web/src
COPY boot/src boot/src

# Copy Flyway migrations
COPY infrastructure-persistence-jpa/src/main/resources/db/migration infrastructure-persistence-jpa/src/main/resources/db/migration

# Build (jOOQ sources are pre-generated in src/main/generated, codegen skipped)
RUN mvn package -DskipTests -Djooq.codegen.skip=true -B

# Runtime stage - using eclipse-temurin which supports arm64
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy the built JAR from boot module
COPY --from=builder /app/boot/target/*.jar app.jar

# Create non-root user
RUN addgroup -S linkpouch && adduser -S linkpouch -G linkpouch
USER linkpouch

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
