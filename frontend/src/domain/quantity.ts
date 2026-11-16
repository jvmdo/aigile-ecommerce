import { MAX_ITEM_QUANTITY } from "@aigile/shared";

export type QuantityCheck = { valid: true } | { valid: false; message: string };

/**
 * Checks a quantity before it is sent: an integer from 1 to {@link MAX_ITEM_QUANTITY}, and
 * no more than the Stock shown. The server checks again against the current Stock.
 */
export function validateQuantity(quantity: number, stock: number): QuantityCheck {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
    return { valid: false, message: `Informe uma quantidade inteira de 1 a ${MAX_ITEM_QUANTITY}.` };
  }
  if (quantity > stock) {
    const units = stock === 1 ? "unidade" : "unidades";
    return { valid: false, message: `Só há ${stock} ${units} em estoque.` };
  }
  return { valid: true };
}
