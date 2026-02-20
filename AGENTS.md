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
- Use @Mapping annotations for all fields
- Use qualifiedByName for custom conversions
- Name converter methods descriptively: `toOffsetDateTime`, `stringToUri`
- NEVER use fully qualified class names in mappers
- Example:
```java
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

**Code Generation:**
- OpenAPI DTOs generated with "DTO" suffix
- jOOQ code from live database (target/generated-sources/)
- Lombok for boilerplate reduction
- NEVER commit generated code

**Database:**
- Flyway migrations in infrastructure-persistence-jpa
- jOOQ requires running DB for code generation
- Regenerate after schema changes: `mvn jooq-codegen:generate`

**Commits:**
- Format: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore
- Example: `feat(stash): add listAllStashes method`

## Important Rules

1. NEVER use fully qualified class names - use imports
2. ALWAYS use @Mapping annotations in MapStruct mappers
3. NEVER commit generated code (jOOQ, OpenAPI)
4. ALWAYS run mvn clean compile before committing Java changes
5. NEVER skip transaction boundaries at application layer
6. ALWAYS regenerate jOOQ code after schema changes
