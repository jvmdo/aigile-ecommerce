import type { AppliedCoupon, OrderStatus } from "@aigile/shared";
import { asc, eq } from "drizzle-orm";
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
  /** Inserts the Order and its items and returns the Order's id. Run it inside the confirmation's transaction. */
  create: (order: NewOrder) => Promise<string>;
  /** The Order with its items in the order they were copied, or null when it does not exist. */
  findById: (id: string) => Promise<OrderRecord | null>;
};

export function createOrdersRepository(db: Queryable): OrdersRepository {
  return {
    create: async ({ items, coupon, ...order }) => {
      const [row] = await db
        .insert(orders)
        .values({
          ...order,
          couponCode: coupon?.code ?? null,
          couponType: coupon?.type ?? null,
          couponValue: coupon?.value ?? null,
        })
        .returning({ id: orders.id });
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
  };
}
