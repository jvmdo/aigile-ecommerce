import { type DomainErrorCode, MAX_ITEM_QUANTITY } from "@aigile/shared";

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
