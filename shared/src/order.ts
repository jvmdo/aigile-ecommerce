import { type Static, Type } from "@sinclair/typebox";
import { AppliedCoupon, MAX_ITEM_QUANTITY } from "./cart.ts";

/** Order Status values. An Order is only ever created for now (FRD, "Order"). */
export const orderStatuses = ["created"] as const;

export const OrderStatus = Type.Union(orderStatuses.map((status) => Type.Literal(status)));

export type OrderStatus = Static<typeof OrderStatus>;

/** An Order Item as the API returns it: copied from a Cart Item; the name is the Product's current one. */
export const OrderItem = Type.Object({
  productId: Type.String({ format: "uuid" }),
  name: Type.String(),
  unitPriceCents: Type.Integer({ minimum: 0 }),
  quantity: Type.Integer({ minimum: 1, maximum: MAX_ITEM_QUANTITY }),
  lineTotalCents: Type.Integer({ minimum: 0 }),
});

export type OrderItem = Static<typeof OrderItem>;

/**
 * The Order `POST /api/carts/:id/confirm` creates and `GET /api/orders/:id` returns. Its money
 * and Coupon are copies taken at confirmation: later changes to the Coupon do not alter it.
 */
export const Order = Type.Object({
  id: Type.String({ format: "uuid" }),
  status: OrderStatus,
  items: Type.Array(OrderItem),
  coupon: Type.Union([AppliedCoupon, Type.Null()]),
  subtotalCents: Type.Integer({ minimum: 0 }),
  discountCents: Type.Integer({ minimum: 0 }),
  totalCents: Type.Integer({ minimum: 0 }),
  createdAt: Type.String({ format: "date-time" }),
});

export type Order = Static<typeof Order>;

/** Path parameters of `/api/orders/:id`. */
export const OrderParams = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export type OrderParams = Static<typeof OrderParams>;
