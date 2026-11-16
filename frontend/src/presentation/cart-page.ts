import type { Cart } from "@aigile/shared";
import { fetchCurrentCart } from "../api/carts.ts";
import { formatPrice } from "../domain/money.ts";
import { createTextElement } from "./dom.ts";

/** `<cart-page>`: loads the Shopper's Cart and shows its items and Subtotal, or the empty Cart message. */
export class CartPage extends HTMLElement {
  connectedCallback(): void {
    this.replaceChildren(createTextElement("p", "cart-message", "Carregando o carrinho…"));
    void this.load();
  }

  private async load(): Promise<void> {
    let cart: Cart | null;
    try {
      cart = await fetchCurrentCart();
    } catch {
      const error = createTextElement(
        "p",
        "cart-message cart-error",
        "Não foi possível carregar o carrinho agora. Tente novamente em alguns instantes.",
      );
      error.setAttribute("role", "alert");
      this.replaceChildren(error);
      return;
    }

    if (cart === null || cart.items.length === 0) {
      this.showEmpty();
      return;
    }
    this.showCart(cart);
  }

  private showEmpty(): void {
    const message = createTextElement("p", "cart-message cart-empty", "Seu carrinho está vazio. ");
    const link = document.createElement("a");
    link.href = "#/";
    link.textContent = "Ver o catálogo";
    message.append(link);
    this.replaceChildren(message);
  }

  private showCart(cart: Cart): void {
    const table = document.createElement("table");
    table.className = "cart-items";

    const headerRow = document.createElement("tr");
    for (const label of ["Produto", "Preço unitário", "Quantidade", "Subtotal do item"]) {
      headerRow.append(createTextElement("th", "", label));
    }
    table.createTHead().append(headerRow);

    const body = table.createTBody();
    for (const item of cart.items) {
      const row = document.createElement("tr");
      row.className = "cart-item";
      row.append(
        createTextElement("td", "cart-item-name", item.name),
        createTextElement("td", "cart-item-unit-price", formatPrice(item.unitPriceCents)),
        createTextElement("td", "cart-item-quantity", String(item.quantity)),
        createTextElement("td", "cart-item-line-total", formatPrice(item.lineTotalCents)),
      );
      body.append(row);
    }

    const subtotal = createTextElement(
      "p",
      "cart-subtotal",
      `Subtotal: ${formatPrice(cart.subtotalCents)}`,
    );
    this.replaceChildren(table, subtotal);
  }
}

customElements.define("cart-page", CartPage);
