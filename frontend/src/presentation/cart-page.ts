import type { Cart, CartItem } from "@aigile/shared";
import { fetchCurrentCart, removeCartItem, updateCartItem } from "../api/carts.ts";
import { formatPrice } from "../domain/money.ts";
import { validateQuantity } from "../domain/quantity.ts";
import { createTextElement } from "./dom.ts";
import { apiErrorMessage, createQuantityInput } from "./quantity-input.ts";

/**
 * `<cart-page>`: loads the Shopper's Cart and shows its items, each with an editable quantity
 * and a remove button, and the Subtotal; or the empty Cart message. Every change redraws the
 * page from the Cart the API returns.
 */
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
    this.show(cart);
  }

  private show(cart: Cart | null): void {
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
    const feedback = document.createElement("p");
    feedback.className = "cart-feedback";

    /**
     * Runs a change against the API with its button disabled, then redraws from the returned
     * Cart or shows why it failed.
     */
    const change = async (button: HTMLButtonElement, request: () => Promise<Cart>) => {
      button.disabled = true;
      try {
        this.show(await request());
      } catch (error) {
        showError(feedback, apiErrorMessage(error));
      } finally {
        button.disabled = false;
      }
    };

    const table = document.createElement("table");
    table.className = "cart-items";
    const headerRow = document.createElement("tr");
    for (const label of ["Produto", "Preço unitário", "Quantidade", "Subtotal do item", ""]) {
      headerRow.append(createTextElement("th", "", label));
    }
    table.createTHead().append(headerRow);

    const body = table.createTBody();
    for (const item of cart.items) {
      body.append(createItemRow(cart.id, item, feedback, change));
    }

    const subtotal = createTextElement(
      "p",
      "cart-subtotal",
      `Subtotal: ${formatPrice(cart.subtotalCents)}`,
    );
    this.replaceChildren(feedback, table, subtotal);
  }
}

function createItemRow(
  cartId: string,
  item: CartItem,
  feedback: HTMLElement,
  change: (button: HTMLButtonElement, request: () => Promise<Cart>) => Promise<void>,
): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.className = "cart-item";

  const form = document.createElement("form");
  form.className = "cart-item-quantity-form";
  form.noValidate = true;
  const input = createQuantityInput(item.quantity);
  input.setAttribute("aria-label", `Quantidade de ${item.name}`);
  const update = document.createElement("button");
  update.type = "submit";
  update.textContent = "Atualizar";
  form.append(input, update);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const quantity = input.valueAsNumber;
    const check = validateQuantity(quantity);
    if (!check.valid) {
      showError(feedback, check.message);
      return;
    }
    await change(update, () => updateCartItem(cartId, item.productId, quantity));
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remover";
  remove.setAttribute("aria-label", `Remover ${item.name}`);
  remove.addEventListener("click", async () => {
    await change(remove, () => removeCartItem(cartId, item.productId));
  });

  const quantityCell = document.createElement("td");
  quantityCell.className = "cart-item-quantity";
  quantityCell.append(form);
  const actionsCell = document.createElement("td");
  actionsCell.className = "cart-item-actions";
  actionsCell.append(remove);

  row.append(
    createTextElement("td", "cart-item-name", item.name),
    createTextElement("td", "cart-item-unit-price", formatPrice(item.unitPriceCents)),
    quantityCell,
    createTextElement("td", "cart-item-line-total", formatPrice(item.lineTotalCents)),
    actionsCell,
  );
  return row;
}

function showError(feedback: HTMLElement, message: string): void {
  feedback.textContent = message;
  feedback.classList.add("cart-error");
  feedback.setAttribute("role", "alert");
}

customElements.define("cart-page", CartPage);
