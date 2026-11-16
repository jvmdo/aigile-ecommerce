import type { Product } from "@aigile/shared";

/** The badge label shown on a sold-out Product. */
export const SOLD_OUT_LABEL = "Esgotado";

/** A Product is shown as sold out ({@link SOLD_OUT_LABEL}) when it has no Stock left. */
export function isSoldOut(product: Pick<Product, "stock">): boolean {
  return product.stock === 0;
}

/** The Stock line shown for every Product, sold out or not: "Estoque: 12". */
export function formatStock(stock: number): string {
  return `Estoque: ${stock}`;
}
