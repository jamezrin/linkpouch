# Runtime-only image — expects a pre-built Spring Boot JAR.
#
# Build the JAR first with Maven (requires a live PostgreSQL for jOOQ codegen):
#   mvn clean verify -B
#
# Then build the image:
#   docker build -t stash-service .

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy the Spring Boot executable JAR from the boot module
COPY boot/target/*.jar app.jar

# Create non-root user
RUN addgroup -S linkpouch && adduser -S linkpouch -G linkpouch
USER linkpouch

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
