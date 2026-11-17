import { type CartsRepository, createCartsRepository } from "../carts/carts.repository.ts";
import { type OrdersRepository, createOrdersRepository } from "../orders/orders.repository.ts";
import {
  type ProductsRepository,
  createProductsRepository,
} from "../products/products.repository.ts";
import type { Database } from "./connection.ts";

/** The Repositories bound to one open transaction. */
export type TransactionalRepositories = {
  carts: CartsRepository;
  products: ProductsRepository;
  orders: OrdersRepository;
};

/**
 * Runs `work` in one database transaction: it commits when `work` resolves and rolls back
 * everything when it throws, so a Service can undo several Repositories' writes by raising
 * a domain error.
 */
export type InTransaction = <T>(
  work: (repositories: TransactionalRepositories) => Promise<T>,
) => Promise<T>;

export function createInTransaction(db: Database): InTransaction {
  return (work) =>
    db.transaction((tx) =>
      work({
        carts: createCartsRepository(tx),
        products: createProductsRepository(tx),
        orders: createOrdersRepository(tx),
      }),
    );
}
