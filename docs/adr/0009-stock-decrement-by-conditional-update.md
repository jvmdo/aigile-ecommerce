# Stock is decremented by an atomic conditional update

When an Order is confirmed, Stock is decremented inside the same transaction that creates the Order, with one `UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty` per item. If any update affects zero rows, the whole transaction rolls back and the Service raises an insufficient-Stock domain error. PostgreSQL's row lock serialises concurrent confirms on the same Product, and the second one re-evaluates the `WHERE` against the committed row, so two Shoppers can never buy the last unit twice. Items are decremented in ascending product-id order so that concurrent confirms always lock rows in the same order and cannot deadlock.

The `stock >= :qty` guard lives in the Repository's SQL. This is a deliberate exception to "no business rules in the Repository" (`CODING_STANDARDS.md`): the guard is a concurrency guarantee, not the business rule. The Repository only reports which items it could not decrement; the Service decides that this means insufficient Stock. Do not "clean this up" into read-check-write in the Service, because that reintroduces the race. A concurrent integration test (two confirms competing for the last unit) pins this down.

## Considered Options

- **Read, check in the Service, then write**: rejected; two concurrent confirms both read the same Stock and both pass the check.
- **Pessimistic `SELECT … FOR UPDATE`**: correct, but adds a read round-trip and explicit locking for no gain over the conditional update.
- **Optimistic version column with retries**: needs an extra column and a retry loop.
- **Event- or queue-based decrement**: needs infrastructure the project does not have.
- **Reserving Stock when items are added to the Cart**: rejected; the Cart only checks Stock without reserving it, so Stock changes in exactly one place.
