import type { Product } from "@aigile/shared";
import { fetchProducts } from "../api/products.ts";
import { ProductCard } from "./product-card.ts";

type MessageState = "loading" | "empty" | "error";

const messages: Record<MessageState, { text: string; alert: boolean }> = {
  loading: { text: "Carregando o catálogo…", alert: false },
  empty: { text: "Nenhum produto disponível no momento.", alert: false },
  error: {
    text: "Não foi possível carregar o catálogo agora. Tente novamente em alguns instantes.",
    alert: true,
  },
};

/** `<catalog-page>`: loads the catalog and shows the list, the empty state or the error state. */
export class CatalogPage extends HTMLElement {
  connectedCallback(): void {
    this.showMessage("loading");
    void this.load();
  }

  private async load(): Promise<void> {
    let products: Product[];
    try {
      products = await fetchProducts();
    } catch {
      this.showMessage("error");
      return;
    }

    if (products.length === 0) {
      this.showMessage("empty");
      return;
    }
    this.showProducts(products);
  }

  private showProducts(products: Product[]): void {
    const list = document.createElement("ul");
    list.className = "catalog-list";
    for (const product of products) {
      const card = new ProductCard();
      card.product = product;
      const item = document.createElement("li");
      item.append(card);
      list.append(item);
    }
    this.replaceChildren(list);
  }

  private showMessage(state: MessageState): void {
    const { text, alert } = messages[state];
    const message = document.createElement("p");
    message.className = `catalog-message catalog-${state}`;
    message.textContent = text;
    if (alert) {
      message.setAttribute("role", "alert");
    }
    this.replaceChildren(message);
  }
}

customElements.define("catalog-page", CatalogPage);
