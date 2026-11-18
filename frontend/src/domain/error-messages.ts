import {
  type CartItem,
  type DomainErrorCode,
  type InsufficientStockDetail,
  MAX_ITEM_QUANTITY,
} from "@aigile/shared";

const domainErrorMessages: Record<DomainErrorCode, string> = {
  CART_NOT_FOUND: "Seu carrinho não foi encontrado.",
  CART_ITEM_NOT_FOUND: "Este produto não está mais no carrinho.",
  PRODUCT_NOT_FOUND: "Este produto não está mais disponível.",
  ORDER_NOT_FOUND: "Pedido não encontrado.",
  INVALID_CART_TRANSITION: "Essa ação não é permitida no estado atual do carrinho.",
  CART_EMPTY: "Seu carrinho está vazio.",
  INSUFFICIENT_STOCK: "Não há estoque suficiente para essa quantidade.",
  COUPON_ALREADY_USED: "Você já usou este cupom em outro pedido.",
  QUANTITY_LIMIT_EXCEEDED: `O carrinho aceita no máximo ${MAX_ITEM_QUANTITY} unidades de cada produto.`,
  COUPON_NOT_FOUND: "Cupom não encontrado.",
  COUPON_EXPIRED: "Este cupom expirou.",
};

const GENERIC_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

/** The Portuguese message shown for an API error code; a generic one when the code is unknown or missing. */
export function errorMessage(code: string | undefined): string {
  if (code === "VALIDATION_ERROR") {
    return "Confira os dados informados.";
  }
  if (code !== undefined && Object.hasOwn(domainErrorMessages, code)) {
    return domainErrorMessages[code as DomainErrorCode];
  }
  return GENERIC_MESSAGE;
}

/**
 * The message for a failed API call about these Cart items. An `INSUFFICIENT_STOCK` refusal
 * names every short Product from its `details` (`[{ productId, requested, available }]`)
 * with what is left of it; other codes, Products not among `items` or details in another
 * shape get the message of {@link errorMessage}.
 */
export function cartErrorMessage(
  code: string | undefined,
  details: unknown,
  items: readonly Pick<CartItem, "productId" | "name">[],
): string {
  if (code !== "INSUFFICIENT_STOCK" || !Array.isArray(details)) {
    return errorMessage(code);
  }
  const named: string[] = [];
  for (const shortage of details as Partial<InsufficientStockDetail>[]) {
    const item = items.find((candidate) => candidate.productId === shortage?.productId);
    const available = shortage?.available;
    if (item !== undefined && typeof available === "number") {
      named.push(`${item.name} (${describeLeft(available)})`);
    }
  }
  if (named.length === 0) {
    return errorMessage(code);
  }
  return `Não há estoque suficiente de: ${named.join(", ")}.`;
}

function describeLeft(available: number): string {
  if (available === 0) {
    return "esgotado";
  }
  return available === 1 ? "resta 1" : `restam ${available}`;
}
