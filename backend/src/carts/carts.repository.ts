import type { CartStatus } from "@aigile/shared";
import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "../db/connection.ts";
import { cartItems, carts, products } from "../db/schema.ts";

/** A Cart as stored, before the Service computes its money fields. */
export type CartRecord = {
  id: string;
  shopperId: string;
  status: CartStatus;
  items: CartItemRecord[];
};

export type CartItemRecord = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export type CartsRepository = {
  /** Inserts an empty Cart and returns its id. */
  create: (shopperId: string, now: Date) => Promise<string>;
  /** The Cart with its items in the order they entered it, or null when it does not exist. */
  findById: (id: string) => Promise<CartRecord | null>;
  /**
   * Inserts the Cart Item, or adds `quantity` to the existing one for that Product (keeping
   * the unit price it entered with), and records the Cart's new status and last change, in
   * one transaction. The increment happens in SQL so concurrent additions are not lost.
   */
  addItem: (item: NewCartItem, cart: CartChange) => Promise<void>;
};

/** What a successful mutation records on the Cart: the status the Service chose and when. */
export type CartChange = {
  status: CartStatus;
  changedAt: Date;
};

export type NewCartItem = {
  cartId: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
};

export function createCartsRepository(db: Database): CartsRepository {
  return {
    create: async (shopperId, now) => {
      const [row] = await db
        .insert(carts)
        .values({ shopperId, lastChangedAt: now })
        .returning({ id: carts.id });
      if (row === undefined) {
        throw new Error("INSERT INTO carts returned no row");
      }
      return row.id;
    },

    findById: async (id) => {
      const [cart] = await db
        .select({ id: carts.id, shopperId: carts.shopperId, status: carts.status })
        .from(carts)
        .where(eq(carts.id, id));
      if (cart === undefined) {
        return null;
      }
      const items = await db
        .select({
          productId: cartItems.productId,
          name: products.name,
          unitPriceCents: cartItems.unitPriceCents,
          quantity: cartItems.quantity,
        })
        .from(cartItems)
        .innerJoin(products, eq(products.id, cartItems.productId))
        .where(eq(cartItems.cartId, id))
        .orderBy(asc(cartItems.insertionOrder));
      return { ...cart, items };
    },

    addItem: (item, { status, changedAt }) =>
      db.transaction(async (tx) => {
        await tx
          .insert(cartItems)
          .values(item)
          .onConflictDoUpdate({
            target: [cartItems.cartId, cartItems.productId],
            set: { quantity: sql`${cartItems.quantity} + excluded.quantity` },
          });
        await tx
          .update(carts)
          .set({ status, lastChangedAt: changedAt })
          .where(eq(carts.id, item.cartId));
      }),
  };
}
