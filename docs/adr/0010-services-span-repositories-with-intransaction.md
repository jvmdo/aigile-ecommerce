# Services span several Repositories with `InTransaction`

When one business operation must write through several Repositories atomically (confirming an Order moves the Cart, decrements Stock and creates the Order), the Service calls `InTransaction` (`backend/src/db/transaction.ts`). It opens one database transaction and hands the Service the Repositories bound to it: `work({ carts, products, orders })`. The transaction commits when `work` resolves and rolls back everything when it throws, so the Service undoes all the writes simply by raising a domain error (`INSUFFICIENT_STOCK`, `COUPON_EXPIRED`, and from ticket 07 `COUPON_ALREADY_USED` translated from a unique-index violation). The Service still decides the business rules and never touches Drizzle; each Repository still only wraps Drizzle.

Repositories take a `Queryable` (the database or an open transaction), so the same factory serves both. `transaction.ts` lives in `db/` and imports every feature's Repository: a deliberate exception to grouping by feature (`CODING_STANDARDS.md`), because the transaction is infrastructure shared across features. Add a feature's Repository there when its writes must join such a transaction; don't build a second mechanism.

## Considered Options

- **One Repository method doing the whole operation** (e.g. `carts.confirm`): the Repository would decide that a short Stock aborts the Order, a business rule, and reach into other features' tables.
- **Passing the Drizzle transaction to the Service**: the Service would depend on Drizzle, breaking the layering.
- **A Repository per operation that receives the other Repositories**: hides the transaction boundary and still mixes rules into the Repository.
