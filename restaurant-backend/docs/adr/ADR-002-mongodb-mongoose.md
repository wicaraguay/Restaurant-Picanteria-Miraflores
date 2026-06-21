# ADR-002: Use MongoDB with Mongoose

## Status

Accepted

## Context

The restaurant system handles diverse data with varying structures:

- **Menu items**: Flexible attributes (allergens, modifiers, seasonal availability)
- **Orders**: Dynamic line items with variable customizations
- **Customers**: Optional fields (address, preferences, loyalty data)
- **Bills**: Complex nested structures (items, taxes, payment methods, SRI responses)

Requirements:
- Rapid development and iteration on data models
- Support for embedded documents (order items within orders)
- Flexible schema to accommodate restaurant-specific customizations
- Developer familiarity with JavaScript ecosystem
- Cost-effective hosting for initial deployment

Alternatives considered:
1. **PostgreSQL + TypeORM**: Strong consistency, relational integrity, but rigid schema requires migrations for every change
2. **DynamoDB**: Serverless, high scalability, but higher learning curve and vendor lock-in
3. **MongoDB + Mongoose**: Flexible schema, embedded documents, easy local development

## Decision

Use **MongoDB** as the database with **Mongoose** as the ODM (Object-Document Mapper).

**Configuration**:
- MongoDB 5.0+ for transaction support
- Mongoose schemas with validation for type safety
- Indexes on frequently queried fields (RUC, email, date ranges)
- Soft deletes via `deletedAt` field for audit trail
- Timestamps enabled (`createdAt`, `updatedAt`)

**Repository Pattern**:
- All database access goes through repository interfaces (domain layer)
- Mongoose implementations in infrastructure layer
- This allows swapping to PostgreSQL in the future if needed

## Consequences

### Positive

- **Schema Flexibility**: Can add fields without migrations (e.g., new menu item attributes)
- **Embedded Documents**: Natural representation of orders with line items, avoiding joins
- **Developer Experience**: JavaScript-native, familiar to Node.js developers
- **Rapid Prototyping**: Quick to iterate on data models during initial development
- **JSON-Native**: Direct mapping to REST API responses without complex ORMs
- **Local Development**: MongoDB can run in Docker or MongoDB Atlas offers free tier
- **Mongoose Validation**: Schema-level validation catches errors before database operations
- **Middleware Hooks**: Pre-save, post-save hooks for business logic (e.g., updating inventory)

### Negative

- **Transactions**: More complex than PostgreSQL (requires replica sets)
- **Data Integrity**: No foreign key constraints; must enforce referential integrity in application code
- **Joins**: Less efficient than relational databases (embedded documents mitigate this)
- **Memory Usage**: Can be higher for large result sets
- **Type Safety**: Less strict than TypeORM; requires discipline with Mongoose schemas
- **Query Complexity**: Aggregation pipelines harder to read/debug than SQL

### Mitigations

- **Validation Layer**: Strict Mongoose schemas with required fields, enums, and custom validators
- **Repositories**: Abstraction layer allows switching to SQL if requirements change
- **Transactions**: Use sessions for multi-document operations (e.g., creating order + updating inventory)
- **Indexes**: Carefully designed indexes for performance-critical queries
- **TypeScript Types**: Generate TypeScript interfaces from Mongoose schemas for type safety

## Examples

**Mongoose Schema with Validation**:
```typescript
const BillSchema = new Schema({
  billNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  status: {
    type: String,
    enum: ['draft', 'authorized', 'rejected'],
    default: 'draft'
  }
}, { timestamps: true });
```

## References

- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Transactions](https://docs.mongodb.com/manual/core/transactions/)
- `src/infrastructure/database/schemas/` - Mongoose schemas
- `src/domain/repositories/` - Repository interfaces
