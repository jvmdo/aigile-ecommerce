import type { Product } from "@aigile/shared";

/** A Product is shown as "Esgotado" when it has no Stock left. */
export function isSoldOut(product: Pick<Product, "stock">): boolean {
  return product.stock === 0;
}

/** The Stock line shown for every Product, sold out or not: "Estoque: 12". */
export function formatStock(stock: number): string {
  return `Estoque: ${stock}`;
}
