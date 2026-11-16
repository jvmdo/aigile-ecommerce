import { type Static, Type } from "@sinclair/typebox";

/** The most units of one Product a Cart Item can hold (FRD, "Cart Items"). */
export const MAX_ITEM_QUANTITY = 99;

/** Cart Status values, in the order of the course's state diagram (GLOSSARY.md, "Cart Status"). */
export const cartStatuses = [
  "empty",
  "with_items",
  "checkout",
  "order_created",
  "abandoned",
] as const;

export const CartStatus = Type.Union(cartStatuses.map((status) => Type.Literal(status)));

export type CartStatus = Static<typeof CartStatus>;

/** A Cart Item as the API returns it. The name is the Product's current one; the unit price is fixed when it entered the Cart. */
export const CartItem = Type.Object({
  productId: Type.String({ format: "uuid" }),
  name: Type.String(),
  unitPriceCents: Type.Integer({ minimum: 0 }),
  quantity: Type.Integer({ minimum: 1, maximum: MAX_ITEM_QUANTITY }),
  lineTotalCents: Type.Integer({ minimum: 0 }),
});

export type CartItem = Static<typeof CartItem>;

/** The Coupon applied to a Cart: `value` is a percentage (1 to 100) or integer cents, by `type`. */
export const AppliedCoupon = Type.Object({
  code: Type.String(),
  type: Type.Union([Type.Literal("percentage"), Type.Literal("fixed")]),
  value: Type.Integer({ minimum: 1 }),
});

export type AppliedCoupon = Static<typeof AppliedCoupon>;

/** The full Cart every Cart route returns. Money is integer cents computed by the server (ADR 0005). */
export const Cart = Type.Object({
  id: Type.String({ format: "uuid" }),
  status: CartStatus,
  /** Ordered by when each Product entered the Cart. */
  items: Type.Array(CartItem),
  coupon: Type.Union([AppliedCoupon, Type.Null()]),
  subtotalCents: Type.Integer({ minimum: 0 }),
  discountCents: Type.Integer({ minimum: 0 }),
  totalCents: Type.Integer({ minimum: 0 }),
});

export type Cart = Static<typeof Cart>;

/** Path parameters of every `/api/carts/:id` route. */
export const CartParams = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export type CartParams = Static<typeof CartParams>;

/** Path parameters of every `/api/carts/:id/items/:productId` route. */
export const CartItemParams = Type.Object({
  id: Type.String({ format: "uuid" }),
  productId: Type.String({ format: "uuid" }),
});

export type CartItemParams = Static<typeof CartItemParams>;

/** `POST /api/carts`: creates an empty Cart for the Shopper. */
export const CreateCartBody = Type.Object({
  shopperId: Type.String({ format: "uuid" }),
});

export type CreateCartBody = Static<typeof CreateCartBody>;

/** `POST /api/carts/:id/items`: adds a Product, or adds to the quantity of its Cart Item. */
export const AddCartItemBody = Type.Object({
  productId: Type.String({ format: "uuid" }),
  quantity: Type.Integer({ minimum: 1, maximum: MAX_ITEM_QUANTITY }),
});

export type AddCartItemBody = Static<typeof AddCartItemBody>;

/** `PATCH /api/carts/:id/items/:productId`: replaces the quantity of a Cart Item. */
export const UpdateCartItemBody = Type.Object({
  quantity: Type.Integer({ minimum: 1, maximum: MAX_ITEM_QUANTITY }),
});

export type UpdateCartItemBody = Static<typeof UpdateCartItemBody>;
