# Agent Guidelines for Linkpouch

This file provides guidelines for AI agents working on the Linkpouch codebase.

## Build Commands

### Java (Stash Service & API Gateway)

```bash
# Install dependencies and compile
cd services/stash-service
mise exec java -- mvn clean compile

# Build single module
cd services/stash-service
mise exec java -- mvn clean install -DskipTests -pl domain

# Run all tests
mise exec java -- mvn test

# Run single test class
mise exec java -- mvn test -Dtest=StashTest

# Run single test method
mise exec java -- mvn test -Dtest=StashTest#createStash

# Run tests for specific module
mise exec java -- mvn test -pl domain

# Full build (requires database for jOOQ)
mise exec java -- mvn clean package -DskipTests
```

### Python (Indexer Service)

```bash
cd services/indexer-service

# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run single test file
pytest tests/test_indexer.py

# Run single test
pytest tests/test_indexer.py::test_index_link -v

# Format code
black src/ tests/
ruff check src/ tests/

# Type check
mypy src/
```

## Code Style Guidelines

### Java

**Imports:**
- Always import types; never use fully qualified names unless resolving naming conflicts
- Group imports: java.*, javax.*, third-party, com.linkpouch.*
- No wildcard imports (except lombok.*)
- Static imports last
- Remove unused imports

**Formatting:**
- 4 spaces indentation (no tabs)
- Opening brace on same line
- Line length: 120 characters
- One blank line between methods
- Final modifier on parameters when possible

**Naming:**
- Classes: PascalCase (StashController, CreateStashRequest)
- Methods: camelCase (createStash, findById)
- Constants: UPPER_SNAKE_CASE
- Variables: camelCase
- Records: descriptive names (StashResponse, not SR)

**Types:**
- Prefer `var` for local variables when type is obvious
- Use records for DTOs (immutable)
- Use `Optional<T>` for nullable returns
- Avoid null - use Optional or empty collections

**MapStruct Mappers:**
- Name methods: `mapIn` (external → domain), `mapOut` (domain → external)
- **REQUIRED: Use @Mapping annotations for ALL fields, even with same names** - makes code resilient to field renames/refactors
- Use qualifiedByName for custom conversions
- Name converter methods descriptively: `toOffsetDateTime`, `stringToUri`
- NEVER use fully qualified class names in mappers
- Example:
```java
@Mapping(target = "id", source = "id")
@Mapping(target = "name", source = "name")
@Mapping(target = "linkCount", constant = "0")
@Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "toOffsetDateTime")
StashResponseDTO mapOut(StashResponse response);
```

**Error Handling:**
- Use unchecked exceptions for domain errors
- Custom exceptions extend RuntimeException
- @ControllerAdvice for global exception handling
- Log exceptions with context before throwing

**Testing:**
- JUnit 5 with AssertJ assertions
- Test naming: `shouldDoSomethingWhenCondition()`
- Given-When-Then comments in test methods
- Mockito for mocking, @ExtendWith(MockitoExtension.class)

### Python

**Formatting:**
- Black formatter: 100 character line length
- Ruff linter: E, F, I, W, C, N, UP, B, A rules
- No trailing whitespace
- One blank line between functions, two between classes

**Naming:**
- Functions/variables: snake_case
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Private methods: _leading_underscore

**Type Hints:**
- Use Python 3.13+ type hints everywhere
- from __future__ import annotations for forward refs
- Use | instead of Union (str | None)

**Error Handling:**
- Use exceptions, not return codes
- Log errors with structlog
- Use tenacity for retry logic

## Architecture Guidelines

**Hexagonal Architecture:**
- domain/ - Pure business logic, no frameworks
- application/ - Use cases, transaction boundaries
- infrastructure-*/ - Adapters (4 separate modules)
- Dependency direction: domain ← application ← infrastructure

**Infrastructure Module Isolation:**
- 4 separate infrastructure modules with no circular dependencies:
  - infrastructure-web: REST controllers and API adapters (depends on api-spec)
  - infrastructure-redis: Event publishing via Redis Streams
  - infrastructure-persistence-jpa: JPA entities and repositories (write operations)
  - infrastructure-persistence-jooq: jOOQ queries (read operations)
- Each module is independent with its own dependencies

**Code Generation:**
- OpenAPI DTOs generated with "DTO" suffix
- jOOQ code from live database (target/generated-sources/)
- Lombok for boilerplate reduction
- NEVER commit generated code

**OpenAPI Code Generation:**
- Define API in `api-spec/src/main/resources/openapi/*.yaml`
- Use `openapi-generator-maven-plugin` version 7.20.0
- Generated models MUST have `DTO` suffix: `modelNameSuffix: DTO`
- Controllers implement generated interfaces (e.g., `StashesApi`)
- Web module uses MapStruct to convert between OpenAPI DTOs and application DTOs

**jOOQ Code Generation:**
- Generated code is created from live database schema
- Run `mvn jooq-codegen:generate` after migrations
- Generated classes go to `target/generated-sources/jooq/`
- NOT committed to repository
- Build fails without generated code - this is intentional

**Database:**
- Flyway migrations in infrastructure-persistence-jpa
- jOOQ requires running DB for code generation
- Regenerate after schema changes: `mvn jooq-codegen:generate`

**Transaction Boundaries:**
- Application layer only (services/use cases)
- NEVER in adapters or infrastructure
- Use @Transactional at service methods

**Commits:**
- Format: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore
- Example: `feat(stash): add listAllStashes method`
- Commit after each milestone/feature

**Tool Version Management:**
- Use mise (https://mise.jdx.dev/) for managing Java, Maven, Node.js, Python versions
- Configuration in `mise.toml` at repository root
- Run `mise install` to install all tools

## Important Rules

1. NEVER use fully qualified class names - use imports
2. ALWAYS use @Mapping annotations in MapStruct mappers for ALL fields (even same name)
3. NEVER commit generated code (jOOQ, OpenAPI)
4. ALWAYS run mvn clean compile before committing Java changes
5. NEVER skip transaction boundaries at application layer
6. ALWAYS regenerate jOOQ code after schema changes
7. NEVER use manual field assignment in mapper default methods - use @Mapping
