import type { Product } from "@aigile/shared";
import { formatPrice } from "../domain/money.ts";
import { formatStock, isSoldOut } from "../domain/stock.ts";

/** `<product-card>`: one Product with its name, description, price and Stock, plus the "Esgotado" badge when sold out. */
export class ProductCard extends HTMLElement {
  set product(product: Product) {
    const soldOut = isSoldOut(product);
    this.classList.toggle("sold-out", soldOut);

    const children = [
      createTextElement("h2", "product-name", product.name),
      createTextElement("p", "product-description", product.description),
      createTextElement("p", "product-price", formatPrice(product.priceCents)),
      createTextElement("p", "product-stock", formatStock(product.stock)),
    ];
    if (soldOut) {
      children.push(createTextElement("p", "product-badge", "Esgotado"));
    }
    this.replaceChildren(...children);
  }
}

/** Creates an element with a class and plain text content (never parsed as HTML). */
function createTextElement(tag: string, className: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

customElements.define("product-card", ProductCard);
