# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy parent POM first
COPY pom.xml .
COPY domain/pom.xml domain/
COPY application/pom.xml application/
COPY infrastructure/pom.xml infrastructure/

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY domain/src domain/src
COPY application/src application/src
COPY infrastructure/src infrastructure/src

# Copy jOOQ generated code to source directory (not target, to avoid clean deletion)
# Create a separate source directory for generated code
RUN mkdir -p infrastructure/src/main/java
COPY infrastructure/target/generated-sources/jooq/com infrastructure/src/main/java/com

# Build without clean (we manually manage the directories)
RUN mvn package -DskipTests -B

# Runtime stage - using eclipse-temurin which supports arm64
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy the built JAR
COPY --from=builder /app/infrastructure/target/*.jar app.jar

# Create non-root user
RUN addgroup -S linkpouch && adduser -S linkpouch -G linkpouch
USER linkpouch

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
