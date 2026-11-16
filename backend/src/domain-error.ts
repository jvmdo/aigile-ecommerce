/** Stable codes a Service can raise; the FRD's "Erros de domínio" table lists when each applies. */
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

/**
 * A business-rule violation raised by a Service. It knows nothing about HTTP: the error
 * handler maps the code to a status and sends the message (Portuguese, user-facing) and
 * details in the shared error envelope.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: unknown;

  constructor(code: DomainErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}
