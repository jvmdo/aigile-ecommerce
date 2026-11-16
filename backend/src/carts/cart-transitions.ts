import type { CartStatus } from "@aigile/shared";
import { DomainError } from "../domain-error.ts";

/** Every operation that changes a Cart. Removing the last item is its own action, since it leads elsewhere. */
export type CartAction =
  | "addItem"
  | "updateItemQuantity"
  | "removeItem"
  | "removeLastItem"
  | "applyCoupon"
  | "removeCoupon"
  | "checkout"
  | "edit";

/**
 * The Cart state machine (FRD do Carrinho, "Máquina de estados do Cart"): for each status, the
 * actions it allows and the status each one leads to. Any action missing here is forbidden.
 */
const transitions: Record<CartStatus, Partial<Record<CartAction, CartStatus>>> = {
  empty: {
    addItem: "with_items",
  },
  with_items: {
    addItem: "with_items",
    updateItemQuantity: "with_items",
    removeItem: "with_items",
    removeLastItem: "empty",
    applyCoupon: "with_items",
    removeCoupon: "with_items",
    checkout: "checkout",
  },
  checkout: {
    applyCoupon: "checkout",
    removeCoupon: "checkout",
    edit: "with_items",
  },
  order_created: {},
  abandoned: {},
};

/** Forbidden on an empty Cart for lack of items, so they get the more specific CART_EMPTY. */
const needsItems: ReadonlySet<CartAction> = new Set(["applyCoupon", "checkout"]);

/**
 * The status a Cart moves to when `action` is applied in `status`. Throws CART_EMPTY or
 * INVALID_CART_TRANSITION (with `details: { status }`) when the table does not allow it.
 */
export function nextStatus(status: CartStatus, action: CartAction): CartStatus {
  const next = transitions[status][action];
  if (next !== undefined) {
    return next;
  }
  if (status === "empty" && needsItems.has(action)) {
    throw new DomainError("CART_EMPTY", "O carrinho está vazio.");
  }
  throw invalidTransition(status);
}

/** INVALID_CART_TRANSITION for a Cart in `status`, which the response carries in `details`. */
export function invalidTransition(status: CartStatus): DomainError {
  return new DomainError(
    "INVALID_CART_TRANSITION",
    "Essa ação não é permitida no estado atual do carrinho.",
    { status },
  );
}
