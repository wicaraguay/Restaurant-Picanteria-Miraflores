# ADR-001: Use Hexagonal Architecture

## Status

Accepted

## Context

The restaurant backend system needs to integrate multiple external services (SRI, email, PDF generation, WhatsApp) while maintaining complex business logic for billing, inventory, and order management. The system must be:

- **Testable**: Business rules should be testable without requiring external dependencies
- **Maintainable**: Clear separation of concerns to allow team members to work independently
- **Flexible**: Ability to swap infrastructure components (e.g., MongoDB to PostgreSQL, email providers) without affecting business logic
- **Scalable**: Support for future requirements like multi-restaurant deployments or additional payment methods

Traditional layered architectures create tight coupling between business logic and infrastructure, making testing difficult and technology changes risky.

## Decision

We adopt **Hexagonal Architecture** (also known as Ports and Adapters or Clean Architecture) with the following structure:

```
src/
├── domain/              # Core business logic and entities
│   ├── entities/        # Business entities (Bill, Order, Customer)
│   ├── repositories/    # Repository interfaces (ports)
│   └── errors/          # Domain-specific errors
├── application/         # Use cases and application services
│   ├── services/        # Application services (BillingService)
│   └── use-cases/       # Specific use cases (CreateInvoice, ProcessOrder)
├── infrastructure/      # Adapters and external integrations
│   ├── database/        # MongoDB schemas and implementations
│   ├── repositories/    # Repository implementations
│   ├── services/        # External service adapters (SRI, Email, PDF)
│   ├── queue/           # Job queue implementation (BullMQ)
│   └── web/             # HTTP controllers, routes, middleware
└── interfaces/          # Entry points (REST API, CLI)
```

**Key Principles**:
- **Domain** is the core and has ZERO external dependencies
- **Application** depends only on Domain
- **Infrastructure** implements Domain interfaces (adapters)
- **Dependency Inversion**: All dependencies point inward toward the domain

## Consequences

### Positive

- **Isolation**: Business logic is completely isolated from frameworks and databases
- **Testability**: Domain and application layers can be tested with simple mocks
- **Technology Independence**: Can replace MongoDB, BullMQ, or email providers without touching business logic
- **Clear Boundaries**: Developers know exactly where to put new code
- **Future-Proof**: Ready for microservices migration if needed
- **Onboarding**: New developers understand the structure through folder names

### Negative

- **Initial Complexity**: More files and folders than a traditional layered approach
- **Learning Curve**: Team members unfamiliar with DDD/Hexagonal need training
- **Boilerplate**: Requires interfaces/ports even for simple operations
- **Indirection**: Following execution flow requires navigating multiple layers
- **Overhead**: For simple CRUD operations, the architecture may feel over-engineered

### Mitigations

- Created comprehensive README documenting the architecture
- Use dependency injection container (DIContainer) to reduce boilerplate
- Team training sessions on Hexagonal Architecture principles
- Example implementations for common patterns (repository, use case, service)

## References

- [Hexagonal Architecture - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- Project README.md - Architecture section
