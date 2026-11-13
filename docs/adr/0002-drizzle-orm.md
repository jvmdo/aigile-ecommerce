# Drizzle as the data-access layer

We chose Drizzle over Prisma, TypeORM and Kysely. It is TypeScript-first, reads close to SQL, ships migrations through `drizzle-kit`, and supports row locking (`.for('update')`) natively, so the stock-decrement strategy decided for the cart feature is not constrained by the ORM. Prisma, the most popular option, would need raw SQL for pessimistic locking.
