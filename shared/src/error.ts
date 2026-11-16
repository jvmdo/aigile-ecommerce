import { type Static, Type } from "@sinclair/typebox";

/** The single error shape every API error response uses (CODING_STANDARDS.md, "Errors"). */
export const ErrorEnvelope = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Unknown()),
  }),
});

export type ErrorEnvelope = Static<typeof ErrorEnvelope>;

/** Stable codes for business-rule violations (FRD do Carrinho, "Erros de domínio"). */
export type DomainErrorCode =
  | "CART_NOT_FOUND"
  | "CART_ITEM_NOT_FOUND"
  | "PRODUCT_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "INVALID_CART_TRANSITION"
  | "CART_EMPTY"
  | "INSUFFICIENT_STOCK"
  | "COUPON_ALREADY_USED"
  | "QUANTITY_LIMIT_EXCEEDED"
  | "COUPON_NOT_FOUND"
  | "COUPON_EXPIRED";

/** `details` of `INSUFFICIENT_STOCK`: one entry per Product whose Stock is short. */
export type InsufficientStockDetail = {
  productId: string;
  requested: number;
  available: number;
};
