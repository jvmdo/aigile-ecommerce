import type { CartStatus } from "@aigile/shared";

/** What the Cart page may offer the Shopper; each one decides which controls appear. */
export type CartPageAction =
  /** Change quantities and remove items. */
  | "editItems"
  /** Apply and remove the Coupon. */
  | "editCoupon"
  /** "Finalizar compra": with_items → checkout. */
  | "checkout"
  /** "Voltar para editar": checkout → with_items. */
  | "edit"
  /** "Confirmar pedido": checkout → order_created, creating the Order. */
  | "confirm";

const actionsByStatus: Record<CartStatus, readonly CartPageAction[]> = {
  empty: [],
  with_items: ["editItems", "editCoupon", "checkout"],
  checkout: ["editCoupon", "edit", "confirm"],
  order_created: [],
  abandoned: [],
};

/** The actions a Cart in this status allows (FRD do Carrinho, "Máquina de estados do Cart"). */
export function allowedCartActions(status: CartStatus): readonly CartPageAction[] {
  return actionsByStatus[status];
}

const statusLabels: Record<CartStatus, string> = {
  empty: "Vazio",
  with_items: "Com itens",
  checkout: "Em checkout",
  order_created: "Pedido criado",
  abandoned: "Abandonado",
};

/** The Portuguese label of a Cart Status, as the Shopper sees it. */
export function cartStatusLabel(status: CartStatus): string {
  return statusLabels[status];
}
