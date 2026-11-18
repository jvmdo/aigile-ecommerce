import type { CartItem } from "@aigile/shared";

/**
 * The total of one Cart or Order line in integer cents: quantity times unit price (FRD,
 * "Cálculo do dinheiro"; ADR 0005). Cart and Order compute it the same way.
 */
export function lineTotalCents(item: Pick<CartItem, "quantity" | "unitPriceCents">): number {
  return item.quantity * item.unitPriceCents;
}
