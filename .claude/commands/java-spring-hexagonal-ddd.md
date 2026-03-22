# java-spring-hexagonal-ddd

## Architecture Overview

This project follows Hexagonal Architecture (Ports & Adapters) with Domain-Driven Design principles in Java/Spring Boot. The architecture enforces strict separation of concerns through **multi-module Gradle/Maven projects**.

## Module Structure

```
project/
├── domain/                    # Entities, value objects, aggregates, domain events, port interfaces, service interfaces.
├── application/               # Use case impls, service impls. Orchestration logic. Transaction boundaries.
├── infrastructure-web/        # Input adapters: REST controllers, GraphQL, etc.
├── infrastructure-messaging/  # Input adapters (consumers) AND output adapters (producers) for Kafka/RabbitMQ etc.
├── infrastructure-postgres/   # Output adapters: JPA repositories, entity mappings.
├── infrastructure-redis/      # Output adapters: Redis cache implementations.
└── boot/                      # Spring Boot app. Composition root. Wires everything together.
```

**Note on `infrastructure-messaging/`:** A single messaging module may contain both consumers (input adapters) and producers (output adapters) for the same technology. Splitting them is only warranted if the module becomes large or the roles are clearly distinct.

### Module dependency rules (strict)

- `domain` depends on **nothing**. No framework dependencies.
- `application` depends on `domain` only.
- `infrastructure-*` modules depend on `domain` only.
- `boot` depends on `application` and all `infrastructure-*` modules (composition root).
- **Infrastructure modules must never depend on `application`.**
- **Infrastructure modules must never depend on other infrastructure modules.**

```
                  ┌──────────────┐
                  │     boot     │  (composition root)
                  └──────┬───────┘
                         │ depends on
          ┌──────────────┼──────────────────┐
          ▼              ▼                  ▼
   application     infra-web          infra-postgres
          │         infra-redis        infra-messaging
          │              │   (all infra-* modules)
          │ depends on   │ depends on
          ▼              ▼
        ┌─────────────────────┐
        │        domain       │  (no dependencies)
        └─────────────────────┘
```

All arrows point inward toward `domain`. `application` and each `infrastructure-*` module independently depend on `domain`. They do not depend on each other.

## Layered Flow

For a given use case, the request flows as follows. Not every use case needs all layers — only introduce a service interface if logic is genuinely shared across multiple use cases.

**Command (write) flow:**
```
Input Adapter (controller, consumer — infrastructure-*)
  → Input Port (use case interface — domain/port/in/)
    → Use Case Impl (orchestration — application/usecase/)
      → [optional] Service Interface (shared logic — domain/service/)
          → Service Impl (application/service/)
      → Output Port Interface (domain/port/out/)
        → Output Adapter Impl (infrastructure-*)
```

**Query (read) flow:**
```
Input Adapter (controller — infrastructure-*)
  → Query Use Case / Query Port (domain/port/in/)
    → Use Case Impl or direct read adapter (application/ or infrastructure-*)
      → Read-optimized Output Port (domain/port/out/)
        → Read Adapter (e.g., jOOQ, projection — infrastructure-*)
```

## Key Concepts and Naming Conventions

### Domain Objects: Entities, Aggregates, and Value Objects

- **Entity**: has a unique identity that persists over time. Mutable state via domain methods.
- **Aggregate Root**: the top-level entity of a cluster of objects that must remain consistent together. All external access to the aggregate goes through the aggregate root. Only the root has a repository/port.
- **Value Object**: defined by its attributes, not identity. Immutable. Examples: `Money`, `Email`, `OrderId`.

Lombok is **allowed and encouraged** in all modules including `domain`. Use it freely for boilerplate reduction (`@Getter`, `@Value`, `@RequiredArgsConstructor`, etc.). Lombok is an annotation processor only — it has no runtime dependency and does not violate the domain's framework-independence rule.

```java
// Aggregate root — enforces invariants
@Getter
public class Order {
    private final OrderId id;
    private final List<OrderLine> lines;
    private OrderStatus status;
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    // Factory method — never a public constructor that accepts raw unvalidated state
    public static Order create(ProductId productId, int quantity, Money unitPrice) {
        if (quantity <= 0) throw new InvalidOrderException("Quantity must be positive");
        var line = new OrderLine(productId, quantity, unitPrice);
        return new Order(OrderId.generate(), new ArrayList<>(List.of(line)), OrderStatus.PENDING);
    }

    private Order(OrderId id, List<OrderLine> lines, OrderStatus status) {
        this.id = id;
        this.lines = lines;
        this.status = status;
    }

    public void confirm() {
        if (status != OrderStatus.PENDING) throw new InvalidOrderStateException("Only pending orders can be confirmed");
        this.status = OrderStatus.CONFIRMED;
        domainEvents.add(new OrderConfirmedEvent(id, Instant.now()));
    }

    public List<DomainEvent> pullEvents() {
        var events = List.copyOf(domainEvents);
        domainEvents.clear();
        return events;
    }
}

// Value object — immutable, equality by value
public record Money(BigDecimal amount, Currency currency) {
    public Money {
        if (amount.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("Amount cannot be negative");
    }

    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) throw new CurrencyMismatchException();
        return new Money(this.amount.add(other.amount), this.currency);
    }
}
```

### Input Port (Use Case Interface)

- Location: `domain/port/in/`
- Naming: `<Verb><Noun>UseCase` for commands, `<Verb><Noun>Query` for reads (see Commands and Queries section).
- One method per interface. May be annotated `@FunctionalInterface`.

```java
@FunctionalInterface
public interface CreateOrderUseCase {
    OrderId execute(CreateOrderCommand command);
}
```

### Use Case Implementation

- Location: `application/usecase/`
- Naming: `<Verb><Noun>UseCaseImpl` / `<Verb><Noun>QueryImpl`
- Implements exactly one use case interface.
- Orchestrates the flow by calling service interfaces and/or output ports.
- Must not contain reusable business logic — delegate that to domain methods or services.
- **Transaction boundaries live here** (see Transaction Boundaries section).

```java
@UseCase  // custom stereotype — see Custom Stereotypes section
@RequiredArgsConstructor
public class CreateOrderUseCaseImpl implements CreateOrderUseCase {

    private final PricingService pricingService;
    private final SaveOrderPort saveOrderPort;

    @Override
    @Transactional  // org.springframework.transaction.annotation.Transactional
    public OrderId execute(CreateOrderCommand command) {
        Money price = pricingService.calculatePrice(command.productId(), command.quantity());
        Order order = Order.create(command.productId(), command.quantity(), price);
        saveOrderPort.save(order);
        return order.getId();
    }
}
```

### Service Interface

- Location: `domain/service/`
- Naming: `<Noun>Service` (e.g., `PricingService`)
- Represents **reusable logic shared across multiple use cases**. Do not create a service for logic used by only one use case.

```java
public interface PricingService {
    Money calculatePrice(ProductId productId, int quantity);
}
```

### Service Implementation

- Location: `application/service/`
- Naming: `<Noun>ServiceImpl`
- May call output ports.

```java
@DomainService  // custom stereotype — see Custom Stereotypes section
@RequiredArgsConstructor
public class PricingServiceImpl implements PricingService {

    private final LoadProductPort loadProductPort;
    private final LoadDiscountPort loadDiscountPort;

    @Override
    public Money calculatePrice(ProductId productId, int quantity) {
        Product product = loadProductPort.loadById(productId);
        Discount discount = loadDiscountPort.findActive(product.category());
        return product.unitPrice().multiply(quantity).apply(discount);
    }
}
```

### Output Port Interface

- Location: `domain/port/out/`
- Naming: `<Verb><Noun>Port` (e.g., `SaveOrderPort`, `LoadProductPort`)
- One method per interface preferred. May be `@FunctionalInterface`.

```java
@FunctionalInterface
public interface SaveOrderPort {
    void save(Order order);
}
```

### Input Adapter

- Location: `infrastructure-web/`, `infrastructure-messaging/`, etc.
- Depends on use case interfaces from `domain` only — never on use case impls or `application`.
- Responsible for framework-specific concerns (HTTP, serialization, validation annotations).
- **HTTP controllers implement OpenAPI-generated interfaces** (from the `api-spec` module) — never write `@RequestMapping`/`@PostMapping` etc. by hand. The generated interface owns the routing, parameter binding, and response type.
- Maps incoming requests to domain commands/queries using MapStruct mappers. Mappers are the bridge that touches both the DTO and the domain type — the DTO class itself must never import domain types directly.
- **Mapper structure**: one shared mapper for cross-cutting type conversions (dates, value objects ↔ primitives/strings, enums) plus one focused mapper per aggregate/domain concept. Each aggregate mapper composes the shared one via `uses`. Controllers inject only the mapper for their aggregate.

```java
// The controller implements a generated interface — never write @PostMapping by hand.
// Routing, parameter binding, and DTO types all come from the OpenAPI-generated interface.
@RestController
@RequiredArgsConstructor
public class OrderController implements OrdersApi {

    private final CreateOrderUseCase createOrderUseCase;
    private final OrderDtoMapper mapper;  // only the mapper for this aggregate

    @Override
    public ResponseEntity<OrderResponseDTO> createOrder(CreateOrderRequestDTO req) {
        OrderId id = createOrderUseCase.execute(mapper.mapIn(req));
        return ResponseEntity.status(HttpStatus.CREATED).body(new OrderResponseDTO(id.value()));
    }
}
```

```java
// Shared mapper for type conversions that cut across all aggregates.
// Handles value object ↔ primitive/String, LocalDateTime ↔ OffsetDateTime, etc.
// No aggregate-level mappings live here.
@Mapper(componentModel = "spring")
public interface WebValueObjectMapper {

    default OffsetDateTime toOffsetDateTime(LocalDateTime ldt) {
        return ldt == null ? null : ldt.atOffset(ZoneOffset.UTC);
    }

    default String orderStatusToString(OrderStatus status) {
        return status != null ? status.name() : null;
    }
}
```

```java
// Aggregate-level mapper — composes the shared mapper.
// Lives in infrastructure-web. It is the only class in this module that imports domain types.
// DTOs are OpenAPI-generated — they know nothing about domain types.
@Mapper(componentModel = "spring", uses = WebValueObjectMapper.class, config = WebMappingConfig.class)
public interface OrderDtoMapper {

    default CreateOrderCommand mapIn(CreateOrderRequestDTO dto) {
        return new CreateOrderCommand(dto.getProductId(), dto.getQuantity());
    }

    @Mapping(target = "id", source = "id")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "createdAt", source = "createdAt")
    OrderResponseDTO mapOut(Order order);

    List<OrderResponseDTO> mapOut(List<Order> orders);
}
```

### Output Adapter

- Location: `infrastructure-postgres/`, `infrastructure-redis/`, `infrastructure-messaging/`, etc.
- Implements output port interfaces from `domain`.
- Owns framework-specific infrastructure (JPA entities, Kafka templates, HTTP clients).
- Must map between domain objects and infrastructure-specific representations using a dedicated MapStruct mapper.
- Infrastructure-specific exceptions must be caught here and translated to domain exceptions before propagating upward — never let them leak into `application` or `domain`.

```java
@Repository
@RequiredArgsConstructor
public class OrderPersistenceAdapter implements SaveOrderPort {

    private final OrderJpaRepository jpaRepo;
    private final OrderEntityMapper mapper;

    @Override
    public void save(Order order) {
        jpaRepo.save(mapper.mapOut(order));
    }
}
```

## Domain Module Rules

- Contains: entities, value objects, aggregates, domain events, port interfaces (in and out), service interfaces, domain exceptions.
- **No Spring annotations** (no `@Component`, `@Service`, etc.).
- No framework runtime dependencies in `build.gradle` / `pom.xml`. Lombok is fine — it is annotation-processor only.
- Domain objects are instantiated via factory methods or constructors, never injected.
- All contracts (ports, service interfaces) are defined here so that both `application` and `infrastructure-*` modules depend inward on `domain` without knowing about each other.

## Commands and Queries (CQRS)

Use case inputs are either **commands** (write intent) or **queries** (read intent). Both are defined alongside their use case interface in `domain/port/in/`. Both are immutable records.

### Naming Convention

- Command use case interfaces: `<Verb><Noun>UseCase` (e.g., `CreateOrderUseCase`, `ConfirmOrderUseCase`)
- Query use case interfaces: `<Verb><Noun>Query` (e.g., `FindOrderSummaryQuery`, `ListOrdersQuery`)

The `Query` suffix distinguishes read-only operations from state-changing ones at a glance, without needing to inspect the method signature.

### Commands

Commands express intent to change state. They may fail with a domain exception. They return only the minimum needed (e.g., a generated ID).

```java
public record CreateOrderCommand(ProductId productId, int quantity) {}
```

### Queries

Queries read state without side effects. They should return purpose-built read models (projections), not full domain aggregates, to avoid over-fetching and exposing internal state.

```java
// Query interface — uses Query suffix, not UseCase
@FunctionalInterface
public interface FindOrderSummaryQuery {
    Optional<OrderSummary> execute(OrderId id);
}

// Read model / projection (not a domain entity)
public record OrderSummary(UUID id, String status, BigDecimal totalAmount) {}

// Query impl — may skip the full domain aggregate and go directly to a read adapter
@UseCase
@RequiredArgsConstructor
public class FindOrderSummaryQueryImpl implements FindOrderSummaryQuery {

    private final LoadOrderSummaryPort loadOrderSummaryPort;

    @Override
    @Transactional(readOnly = true)  // org.springframework.transaction.annotation.Transactional
    public Optional<OrderSummary> execute(OrderId id) {
        return loadOrderSummaryPort.findSummaryById(id);
    }
}
```

**Note:** Query use cases may bypass the full domain aggregate and delegate directly to a read-optimized output port (e.g., a jOOQ or JDBC projection adapter). This avoids loading the full aggregate when only a summary is needed.

## Domain Events

Domain events represent something meaningful that happened in the domain. They are immutable facts, named in the past tense.

- **Marker interface**: define `DomainEvent` in `domain/event/`. All events implement it. Use `List<DomainEvent>` throughout — never `List<Object>`.
- **Definition**: events in `domain/event/`, named `<Noun><PastVerb>Event` (e.g., `OrderConfirmedEvent`).
- **Raising**: aggregate roots collect events internally via `domainEvents` and expose them via `pullEvents()`.
- **Publishing**: via a typed output port (`PublishEventPort`) implemented in an infrastructure module.
- **Handling**: consumers live in `infrastructure-messaging/` or other infrastructure modules.

```java
// Marker interface — in domain/event/
public interface DomainEvent {}

// Concrete event — in domain/event/
public record OrderConfirmedEvent(OrderId orderId, Instant occurredAt) implements DomainEvent {}
```

```java
// Output port for publishing — in domain/port/out/
public interface PublishEventPort {
    void publish(DomainEvent event);
}
```

```java
// Use case: save first, then publish events
// IMPORTANT: publish happens after save but within the same @Transactional boundary.
// If the publisher writes to an external broker (Kafka, RabbitMQ), the transaction
// commit and the publish are NOT atomic. For strong delivery guarantees, use the
// transactional outbox pattern: persist events to an outbox table within the same
// DB transaction and relay them asynchronously.
@Override
@Transactional
public OrderId execute(ConfirmOrderCommand command) {
    Order order = loadOrderPort.load(command.orderId());
    order.confirm();
    saveOrderPort.save(order);
    order.pullEvents().forEach(publishEventPort::publish);
    return order.getId();
}
```

## Transaction Boundaries

Always use `org.springframework.transaction.annotation.Transactional` — not `jakarta.transaction.Transactional`. The Spring annotation supports `readOnly`, propagation levels, rollback rules, and integrates with Spring's transaction infrastructure.

- **Transaction boundaries belong exclusively in the `application` layer** (use case impls and service impls).
- Never place `@Transactional` on infrastructure adapters or domain objects.
- Never place `@Transactional` on input adapters (controllers, consumers).
- Use `@Transactional` at the use case method level for write operations.
- Read-only queries must use `@Transactional(readOnly = true)` — this enables flush-mode NEVER and allows the persistence provider to apply read optimizations.

```java
// Correct — write use case
@Override
@Transactional
public OrderId execute(CreateOrderCommand command) { ... }

// Correct — read-only query
@Override
@Transactional(readOnly = true)
public Optional<OrderSummary> execute(OrderId id) { ... }

// WRONG — transaction in adapter
@Repository
public class OrderPersistenceAdapter implements SaveOrderPort {
    @Transactional  // never here — transaction boundary is the use case's responsibility
    public void save(Order order) { ... }
}
```

## Custom Stereotypes

Define custom Spring stereotype annotations in `application/` to make the role of each class explicit and searchable:

```java
// application/annotation/UseCase.java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Component  // makes it a Spring bean
public @interface UseCase {}

// application/annotation/DomainService.java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Component
public @interface DomainService {}
```

Use `@UseCase` on use case impls and query impls. Use `@DomainService` on service impls. Never use bare `@Component` or `@Service` in the `application` module — the stereotype communicates intent.

## Mapper Conventions

Each infrastructure module that crosses an object representation boundary owns a dedicated mapper. Use **MapStruct** for all mapping. Never hand-roll mappers with plain `@Component` classes.

### General Rules

- **Always use `componentModel = "spring"`** — never use the singleton pattern (`Mappers.getMapper()`). Inject mappers via constructor like any other Spring bean.
- **Prefer interfaces over abstract classes.** Use an abstract class only if you genuinely need a non-mapping helper field (e.g., an injected Spring bean that MapStruct cannot resolve on its own). This is a last resort.
- **Prefer composition via `@Mapper(uses = {...})`** to delegate type conversions to small, focused converter mappers. This keeps each mapper cohesive and avoids bloat.
- **Never use fully qualified class names** inside mapper classes — always use imports.

### Method Naming

- `mapIn(SourceType source)` — maps an external/infrastructure type **into** a domain type (returns a domain entity, aggregate, or value object).
- `mapOut(DomainType source)` — maps a domain type **out** to an external/infrastructure representation (returns a JPA entity, DTO, event payload, etc.).
- If two `mapIn` or `mapOut` methods would have the same parameter type but different return types (conflict), disambiguate with a suffix: `mapInForOrder(...)`, `mapOutForSummary(...)`.
- Keep all `mapIn` methods together and all `mapOut` methods together — do not interlace them.

### Explicit @Mapping on Every Field

Always annotate **every** field with `@Mapping`, even when source and target names are identical. This protects against silent breakage when fields are renamed or added.

Alternatively — or in addition — configure the unmapped target policy to `ERROR` at the mapper or global level so any forgotten field is a compile error. Place the global config in the infrastructure module alongside its mappers (not in `domain` — it imports MapStruct):

```java
// e.g., infrastructure-postgres/src/main/java/.../MappingConfig.java
// Recommended: ERROR for targets (catches forgotten output fields),
// WARN or IGNORE for sources (source objects often have fields you deliberately ignore,
// such as audit metadata on JPA entities).
@MapperConfig(
    unmappedTargetPolicy = ReportingPolicy.ERROR,
    unmappedSourcePolicy = ReportingPolicy.WARN
)
public interface MappingConfig {}

// Per-mapper — reference the shared config
@Mapper(componentModel = "spring", config = MappingConfig.class)
public interface OrderEntityMapper { ... }
```

### Type Conversion and `qualifiedByName`

Rely on MapStruct's **built-in type conversion and smart resolution** before reaching for `@Named` / `qualifiedByName`. MapStruct automatically handles:
- Primitive widening/narrowing
- `String` ↔ numeric types
- `String` ↔ enum (by name)
- `java.util.Date` ↔ `java.util.Calendar`

Only use `qualifiedByName` when two methods have the same signature but different semantics and MapStruct cannot disambiguate on its own. Do not annotate every converter method with `@Named` by default — let MapStruct resolve by type first.

### Collection Mapping

Never hand-roll collection mapping using streams or loops. Declare the collection-level method signature in the interface — MapStruct implements it automatically using the element-level method:

```java
// Declare both — MapStruct implements the List<> overload using mapIn(OrderJpaEntity)
OrderLine mapIn(OrderLineJpaEntity entity);
List<OrderLine> mapIn(List<OrderLineJpaEntity> entities);  // implemented automatically, never written by hand
```

Explicitly declaring the collection method gives callers a typed API and keeps MapStruct in control of the implementation.

### Default Methods and Implemented Methods

Default methods in interfaces (and implemented methods in abstract classes) exist for **last-resort** cases only:
- Wrapping a value object constructor that MapStruct cannot call via `@Mapping` (e.g., a record whose canonical constructor validates its input, or a type like `UUID` that is not a JavaBean).
- A conversion requiring conditional logic that MapStruct expressions cannot express cleanly.

Do not use default methods to map one class to another or to map collections — those are MapStruct's core responsibilities. The `OrderId` ↔ `UUID` case is a canonical example where a default method is appropriate:

```java
@Mapper(componentModel = "spring")
public interface OrderIdMapper {

    // UUID is not a JavaBean — @Mapping on its fields does not work.
    // Default methods are the correct last-resort approach here.
    default OrderId mapIn(UUID id) {
        return id == null ? null : new OrderId(id);
    }

    default UUID mapOut(OrderId orderId) {
        return orderId == null ? null : orderId.value();
    }
}
```

### Partial Updates (null-value strategy)

For PATCH-style use cases, MapStruct's default behaviour sets target fields to `null` when the source field is `null`. Override this with `@BeanMapping`:

```java
// Only update fields that are non-null in the source
@BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
@Mapping(target = "name", source = "name")
@Mapping(target = "quantity", source = "quantity")
void mapInForUpdate(UpdateOrderRequest source, @MappingTarget OrderJpaEntity target);
```

Use the `@MappingTarget` annotation to map onto an existing instance rather than constructing a new one. Restrict partial update methods to infrastructure mappers only — domain aggregates should receive complete commands, not partially patched entities.

### Composition Example

```java
// Small, focused converter mapper for a value object that cannot be mapped via @Mapping
@Mapper(componentModel = "spring")
public interface OrderIdMapper {

    default OrderId mapIn(UUID id) {
        return id == null ? null : new OrderId(id);
    }

    default UUID mapOut(OrderId orderId) {
        return orderId == null ? null : orderId.value();
    }
}

// Line-level mapper — composes OrderIdMapper and MoneyMapper
@Mapper(componentModel = "spring", uses = {OrderIdMapper.class, MoneyMapper.class})
public interface OrderLineEntityMapper {

    // mapIn methods grouped together
    @Mapping(target = "productId", source = "productId")
    @Mapping(target = "quantity", source = "quantity")
    @Mapping(target = "unitPrice", source = "unitPrice")
    OrderLine mapIn(OrderLineJpaEntity entity);

    List<OrderLine> mapIn(List<OrderLineJpaEntity> entities);

    // mapOut methods grouped together
    @Mapping(target = "productId", source = "productId")
    @Mapping(target = "quantity", source = "quantity")
    @Mapping(target = "unitPrice", source = "unitPrice")
    OrderLineJpaEntity mapOut(OrderLine line);

    List<OrderLineJpaEntity> mapOut(List<OrderLine> lines);
}

// Aggregate mapper — composes the line mapper; does not re-declare line conversion.
// MapStruct resolves List<OrderLine> ↔ List<OrderLineJpaEntity> automatically
// via the composed OrderLineEntityMapper. No @Mapping needed for the lines field.
@Mapper(componentModel = "spring", uses = {OrderIdMapper.class, OrderLineEntityMapper.class})
public interface OrderEntityMapper {

    // mapIn methods
    @Mapping(target = "id", source = "id")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "lines", source = "lines")
    @Mapping(target = "createdAt", source = "createdAt")
    Order mapIn(OrderJpaEntity entity);

    List<Order> mapIn(List<OrderJpaEntity> entities);

    // mapOut methods
    @Mapping(target = "id", source = "id")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "lines", source = "lines")
    @Mapping(target = "createdAt", source = "createdAt")
    OrderJpaEntity mapOut(Order order);

    List<OrderJpaEntity> mapOut(List<Order> orders);
}
```

> The `lines` field is still annotated with `@Mapping` above to comply with the explicit-mapping rule (every field declared). MapStruct resolves the actual type conversion through the composed `OrderLineEntityMapper`. The annotation here is documentation, not instruction — MapStruct would find the conversion even without it.

### Injection Example

Mappers are injected via constructor like any other Spring bean — never accessed via `Mappers.getMapper()`:

```java
@Repository
@RequiredArgsConstructor
public class OrderPersistenceAdapter implements SaveOrderPort, LoadOrderPort {

    private final OrderJpaRepository jpaRepo;
    private final OrderEntityMapper mapper;  // injected by Spring, not Mappers.getMapper()

    @Override
    public void save(Order order) {
        jpaRepo.save(mapper.mapOut(order));
    }

    @Override
    public Order load(OrderId id) {
        return jpaRepo.findById(id.value())
            .map(mapper::mapIn)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }
}
```

## Exception Handling

- **Domain exceptions** live in `domain/exception/` and extend `RuntimeException`. They represent violated business rules.
- **Infrastructure exceptions** (e.g., `DataIntegrityViolationException`) must be caught in the output adapter and translated into domain exceptions before propagating upward. Never let infrastructure-specific exceptions leak into `application` or `domain`.
- **Global exception handling** belongs in an input adapter (e.g., a `@ControllerAdvice` in `infrastructure-web/`). It maps domain exceptions to HTTP responses.

```java
// Domain exception — in domain/exception/
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(OrderId id) {
        super("Order not found: " + id.value());
    }
}

// Output adapter translates missing-entity to a domain exception
@Override
public Order load(OrderId id) {
    return jpaRepo.findById(id.value())
        .map(mapper::mapIn)
        .orElseThrow(() -> new OrderNotFoundException(id));
}

// @ControllerAdvice in infrastructure-web maps domain exceptions to HTTP responses
@ExceptionHandler(OrderNotFoundException.class)
ResponseEntity<ErrorResponse> handle(OrderNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(ex.getMessage()));
}
```

## Boot Module and Wiring

The `boot` module is the **only module** that depends on all other modules. Its sole responsibility is starting Spring Boot and providing the composition root.

- Keep the boot module thin — no business logic, no adapters, no controllers.
- Use `@SpringBootApplication` with explicit `scanBasePackages` if your package structure requires it.
- Infrastructure module beans (adapters, mappers) are registered via `@Component` / `@Repository` / `@Service` scanned by Spring.
- Use `@Configuration` classes inside each infrastructure module to register beans that need explicit instantiation (e.g., Kafka producers, RestTemplate, DataSource).
- The boot module may contain integration test wiring (`@SpringBootTest`) and application-level configuration (`application.yml`).

```java
// boot module — thin entry point
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

```java
// infrastructure-postgres — registers its own beans via @Configuration
@Configuration
public class PersistenceConfiguration {
    @Bean
    public DataSource dataSource(DataSourceProperties props) {
        return props.initializeDataSourceBuilder().build();
    }
}
```

## Code Generation (OpenAPI / jOOQ)

### OpenAPI

Define the API contract in a dedicated `api-spec/` Maven/Gradle module as YAML files. Generate controller interfaces and request/response DTOs at build time using the OpenAPI Generator plugin.

- `api-spec/` generates the Java interfaces and DTOs; `infrastructure-web/` depends on `api-spec/`.
- `@RestController` classes implement the generated interfaces — never write routing annotations (`@PostMapping`, etc.) by hand.
- Generated sources live in `target/` — never commit them.
- DTOs are generated into `api-spec/` and used only by `infrastructure-web/` — they never leak into `domain` or `application`.

### jOOQ

jOOQ classes are generated from the live database schema and used exclusively in the read-side output adapters inside the persistence infrastructure module.

- jOOQ sources are committed to `src/main/generated/` — normal builds pass `-Djooq.codegen.skip=true` and use them directly.
- Regenerate after every schema migration by running `mvn jooq-codegen:generate -pl infrastructure-persistence` against a live DB, then commit the result.
- The build fails without generated classes — this is intentional and ensures schema drift is caught immediately.

## Refactoring Guidelines

When incrementally migrating an existing codebase toward this architecture, work module by module. The `boot` module will exist from the start — the goal is to progressively move code into the correct modules and enforce boundaries as you go. Not all steps apply in every migration; treat this as a checklist rather than a strict sequence.

1. **Identify bounded contexts** first. Each may become its own set of modules.
2. **Extract domain objects** — remove all framework annotations from core business logic.
3. **Model aggregates** — identify consistency boundaries. Only one aggregate root per repository/port.
4. **Define use case interfaces in domain** — one per business operation.
5. **Define output ports in domain** — one interface per external dependency interaction.
6. **Separate shared logic into service interfaces in domain** — only if two or more use cases share behavior.
7. **Implement use cases and services in application** — place `@Transactional` here, use custom stereotypes.
8. **Move adapters into technology-specific infrastructure modules** — one module per technology.
9. **Enforce module boundaries** — use Gradle/Maven module dependencies to make illegal dependencies a compile error.
10. **Never skip the port interface** — even if there's only one implementation. The interface is the contract; the module boundary enforces it.

## Testing Strategy

- **Domain**: plain unit tests. No Spring context. No mocks needed. Test invariants, factory methods, value object equality, and domain events raised by aggregates.
- **Use Case Impls**: unit tests with mocked service and port interfaces. Lambdas work well if ports are `@FunctionalInterface`. Verify `@Transactional` propagation via a slice integration test if needed.
- **Services**: unit tests with mocked output ports.
- **Mappers**: unit-test MapStruct mappers independently — instantiate the generated implementation directly (no Spring context required) and assert field-by-field. Do not rely solely on adapter integration tests to catch mapping mistakes.
  ```java
  // Fast, no-Spring mapper unit test
  class OrderEntityMapperTest {
      private final OrderEntityMapper mapper = Mappers.getMapper(OrderEntityMapper.class);
      // Note: Mappers.getMapper() is acceptable in tests — the no-singleton rule
      // applies to production code only. In tests there is no Spring context to inject from.

      @Test
      void shouldMapInCorrectly() {
          var entity = new OrderJpaEntity(/* ... */);
          var order = mapper.mapIn(entity);
          assertThat(order.getId().value()).isEqualTo(entity.getId());
          // assert every field
      }
  }
  ```
- **Infrastructure adapters**: integration tests (`@DataJpaTest`, `@WebMvcTest`, Testcontainers, etc.) within each infrastructure module.
- **End-to-end**: `@SpringBootTest` in the `boot` module.
