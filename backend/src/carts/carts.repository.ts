import type { CartStatus, CouponType } from "@aigile/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "../db/connection.ts";
import { cartItems, carts, coupons, products } from "../db/schema.ts";

/** A Cart as stored, before the Service computes its money fields. */
export type CartRecord = {
  id: string;
  shopperId: string;
  status: CartStatus;
  items: CartItemRecord[];
  coupon: CouponRecord | null;
};

/** A Coupon as stored; its code is in upper case. */
export type CouponRecord = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  expiresAt: Date;
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
   * Every mutation below returns false, writing nothing, when the Cart is no longer in
   * `cart.from` (another request changed its status since the Service read it).
   */
  addItem: (item: NewCartItem, cart: CartChange) => Promise<boolean>;
  /** Replaces the quantity of a Cart Item and records the Cart's change, in one transaction. */
  updateItemQuantity: (item: CartItemKey, quantity: number, cart: CartChange) => Promise<boolean>;
  /** Deletes a Cart Item and records the Cart's change, in one transaction. */
  removeItem: (item: CartItemKey, cart: CartChange) => Promise<boolean>;
  /** The Coupon with exactly this (upper-case) code, or null when there is none. */
  findCouponByCode: (code: string) => Promise<CouponRecord | null>;
  /** Sets the Coupon the Cart carries (null for none) and records the Cart's change. */
  setCoupon: (cartId: string, couponId: string | null, cart: CartChange) => Promise<boolean>;
  /** Records a change of the Cart alone (a status transition), with no item touched. */
  recordChange: (cartId: string, cart: CartChange) => Promise<boolean>;
};

/** Identifies a Cart Item: a Cart holds at most one per Product. */
export type CartItemKey = {
  cartId: string;
  productId: string;
};

/**
 * What a successful mutation records on the Cart: the status the Service chose and when.
 * `from` is the status the Service checked the action against; the write only happens while
 * the Cart is still in it. `couponId: null` also removes the Coupon (the last item left);
 * left out, the Coupon stays.
 */
export type CartChange = {
  from: CartStatus;
  status: CartStatus;
  changedAt: Date;
  couponId?: string | null;
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
      const [row] = await db
        .select({
          id: carts.id,
          shopperId: carts.shopperId,
          status: carts.status,
          coupon: {
            id: coupons.id,
            code: coupons.code,
            type: coupons.type,
            value: coupons.value,
            expiresAt: coupons.expiresAt,
          },
        })
        .from(carts)
        .leftJoin(coupons, eq(coupons.id, carts.couponId))
        .where(eq(carts.id, id));
      if (row === undefined) {
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
      return { ...row, items };
    },

    // Each transaction updates the Cart row first: the conditional update checks the status
    // and locks the row, so concurrent mutations of one Cart run one after the other.
    addItem: (item, change) =>
      db.transaction(async (tx) => {
        if (!(await recordChange(tx, item.cartId, change))) {
          return false;
        }
        await tx
          .insert(cartItems)
          .values(item)
          .onConflictDoUpdate({
            target: [cartItems.cartId, cartItems.productId],
            set: { quantity: sql`${cartItems.quantity} + excluded.quantity` },
          });
        return true;
      }),

    updateItemQuantity: (item, quantity, change) =>
      db.transaction(async (tx) => {
        if (!(await recordChange(tx, item.cartId, change))) {
          return false;
        }
        await tx.update(cartItems).set({ quantity }).where(matchesItem(item));
        return true;
      }),

    removeItem: (item, change) =>
      db.transaction(async (tx) => {
        if (!(await recordChange(tx, item.cartId, change))) {
          return false;
        }
        await tx.delete(cartItems).where(matchesItem(item));
        return true;
      }),

    findCouponByCode: async (code) => {
      const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code));
      return coupon ?? null;
    },

    setCoupon: (cartId, couponId, change) => recordChange(db, cartId, { ...change, couponId }),

    recordChange: (cartId, change) => recordChange(db, cartId, change),
  };
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

function matchesItem({ cartId, productId }: CartItemKey) {
  return and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId));
}

/** Records the change while the Cart is still in `from`; false when it no longer is. */
async function recordChange(
  tx: Database | Transaction,
  cartId: string,
  { from, status, changedAt, couponId }: CartChange,
): Promise<boolean> {
  const updated = await tx
    .update(carts)
    .set({ status, lastChangedAt: changedAt, couponId })
    .where(and(eq(carts.id, cartId), eq(carts.status, from)))
    .returning({ id: carts.id });
  return updated.length > 0;
}
