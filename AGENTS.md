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

# Full build including tests (requires PostgreSQL for jOOQ codegen)
# Default DB connection is localhost:5432/linkpouch (matches docker-compose)
# Run Atlas migrations FIRST so jOOQ can introspect the schema:
atlas migrate apply --env local
mise exec java -- mvn clean verify -B

# Format all Java code (Spotless + palantir-java-format)
mise exec java -- mvn spotless:apply

# Check formatting without modifying files
mise exec java -- mvn spotless:check
```

### Atlas (Database Migrations)

```bash
# Apply pending migrations to local DB
atlas migrate apply --env local

# Create a new blank migration file
atlas migrate new --env local <name>

# Recalculate atlas.sum after manually editing a migration file
atlas migrate hash --env local

# Show current migration status
atlas migrate status --env local
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
- Always import types; never use fully qualified names unless resolving conflicts
- Group: java.*, javax.*, third-party, com.linkpouch.*
- No wildcard imports (except lombok.*)
- Static imports last
- Remove unused imports

**Formatting:**
- Enforced by **Spotless** with `palantir-java-format` (run `mvn spotless:apply` before committing)
- 4 spaces indentation (no tabs), opening brace on same line
- Line length: 100 characters (palantir-java-format default)
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
- 5 separate infrastructure modules with no circular dependencies:
  - infrastructure-web: REST controllers and API adapters (depends on api-spec)
  - infrastructure-redis: Event publishing via Redis Streams
  - infrastructure-persistence: JPA entities/repositories (writes) + jOOQ queries (reads)
  - infrastructure-http: Outbound HTTP adapter (embeddability check, SSRF protection)
  - infrastructure-sse: Server-Sent Events adapter (real-time link status broadcasts)
- Each module is independent with its own dependencies

**Code Generation:**
- OpenAPI: Define in `api-spec/src/main/resources/openapi/*.yaml`, use plugin v7.20.0
- jOOQ: Generated from live DB schema to `infrastructure-persistence/src/main/generated/`
- Lombok for boilerplate reduction
- NEVER commit generated code (jOOQ, OpenAPI)
- Regenerate jOOQ after migrations: `mvn jooq-codegen:generate`
- Build fails without generated code - intentional

**Database:**
- Atlas migrations in `infrastructure-persistence/src/main/resources/db/migrations/` (versioned, with `atlas.sum`)
- Atlas config at repo root: `atlas.hcl` (defines `local` and `ci` environments)
- jOOQ requires a running DB with migrations already applied for code generation

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

## Releasing User-Visible Changes

When a change is user-visible (new feature, behaviour change, or notable fix), update the in-app changelog **in the same commit** as the code change:

**File:** `frontend/src/changelog.ts`

1. Add a new entry object at the **top** of the `changelog` array.
2. Increment `LATEST_VERSION` by 1.
3. Set `version` to the new `LATEST_VERSION` value.
4. Set `date` to today's date in `'Month D, YYYY'` format (e.g. `'March 8, 2026'`).
5. Write concise, user-friendly `items` bullet points (what changed and why it matters).

```ts
export const LATEST_VERSION = 2; // was 1

export const changelog: ChangelogEntry[] = [
  {
    version: 2,
    date: 'March 15, 2026',
    items: [
      'Your new feature or fix described for the user',
    ],
  },
  // ... previous entries unchanged
];
```

**What counts as user-visible:** new UI features, bug fixes the user would notice, performance improvements, new settings or controls.

**What does NOT need a changelog entry:** refactors, internal infrastructure changes, CI/CD updates, dependency upgrades with no UX impact.

## Important Rules

1. NEVER use fully qualified class names - use imports
2. ALWAYS use @Mapping annotations in MapStruct mappers for ALL fields (even same name)
3. NEVER commit generated code (jOOQ, OpenAPI)
4. ALWAYS run `mvn spotless:apply` then `mvn clean compile` before committing Java changes
5. NEVER skip transaction boundaries at application layer
6. NEVER use manual field assignment in mapper default methods
7. ALWAYS update `frontend/src/changelog.ts` when making user-visible changes (see "Releasing User-Visible Changes" above)
