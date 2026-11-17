import type { AppliedCoupon, OrderStatus } from "@aigile/shared";
import { DrizzleQueryError, and, asc, eq } from "drizzle-orm";
import type { Queryable } from "../db/connection.ts";
import { orderItems, orders, products } from "../db/schema.ts";

/** An Order as stored: its money and Coupon are the copies taken at confirmation. */
export type OrderRecord = {
  id: string;
  status: OrderStatus;
  items: OrderItemRecord[];
  coupon: AppliedCoupon | null;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  createdAt: Date;
};

export type OrderItemRecord = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

/** What confirming a Cart writes: the Order, created in status `created`, and its items in order. */
export type NewOrder = {
  shopperId: string;
  cartId: string;
  items: { productId: string; quantity: number; unitPriceCents: number }[];
  coupon: AppliedCoupon | null;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  createdAt: Date;
};

export type OrdersRepository = {
  /**
   * Inserts the Order and its items and returns the Order's id. Run it inside the
   * confirmation's transaction. Returns null, inserting nothing, when the Shopper already has
   * an Order with this Coupon (the `orders_shopper_coupon_unique` index); the transaction is
   * then aborted and must be rolled back.
   */
  create: (order: NewOrder) => Promise<string | null>;
  /** The Order with its items in the order they were copied, or null when it does not exist. */
  findById: (id: string) => Promise<OrderRecord | null>;
  /** Whether the Shopper has an Order that used the Coupon with this (upper-case) code. */
  existsForShopperAndCoupon: (shopperId: string, couponCode: string) => Promise<boolean>;
};

const SHOPPER_COUPON_UNIQUE = "orders_shopper_coupon_unique";
const UNIQUE_VIOLATION = "23505";

/** Whether a failed query broke this unique constraint or index. */
function violatesUnique(error: unknown, constraint: string): boolean {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === UNIQUE_VIOLATION &&
    "constraint" in cause &&
    cause.constraint === constraint
  );
}

export function createOrdersRepository(db: Queryable): OrdersRepository {
  return {
    create: async ({ items, coupon, ...order }) => {
      let row: { id: string } | undefined;
      try {
        [row] = await db
          .insert(orders)
          .values({
            ...order,
            couponCode: coupon?.code ?? null,
            couponType: coupon?.type ?? null,
            couponValue: coupon?.value ?? null,
          })
          .returning({ id: orders.id });
      } catch (error) {
        if (violatesUnique(error, SHOPPER_COUPON_UNIQUE)) {
          return null;
        }
        throw error;
      }
      if (row === undefined) {
        throw new Error("INSERT INTO orders returned no row");
      }
      // One multi-row insert keeps the identity column in the order of `items`.
      await db.insert(orderItems).values(items.map((item) => ({ ...item, orderId: row.id })));
      return row.id;
    },

    findById: async (id) => {
      const [row] = await db.select().from(orders).where(eq(orders.id, id));
      if (row === undefined) {
        return null;
      }
      const items = await db
        .select({
          productId: orderItems.productId,
          name: products.name,
          unitPriceCents: orderItems.unitPriceCents,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.productId))
        .where(eq(orderItems.orderId, id))
        .orderBy(asc(orderItems.insertionOrder));
      const { couponCode, couponType, couponValue } = row;
      return {
        id: row.id,
        status: row.status,
        items,
        coupon:
          couponCode === null || couponType === null || couponValue === null
            ? null
            : { code: couponCode, type: couponType, value: couponValue },
        subtotalCents: row.subtotalCents,
        discountCents: row.discountCents,
        totalCents: row.totalCents,
        createdAt: row.createdAt,
      };
    },

    existsForShopperAndCoupon: async (shopperId, couponCode) =>
      (await db.$count(
        orders,
        and(eq(orders.shopperId, shopperId), eq(orders.couponCode, couponCode)),
      )) > 0,
  };
}
