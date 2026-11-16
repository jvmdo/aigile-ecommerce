import type { Cart, CartItem } from "@aigile/shared";
import {
  applyCoupon,
  fetchCurrentCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from "../api/carts.ts";
import { describeCoupon, validateCouponCode } from "../domain/coupon.ts";
import { formatPrice } from "../domain/money.ts";
import { validateQuantity } from "../domain/quantity.ts";
import { createTextElement } from "./dom.ts";
import { apiErrorMessage, createQuantityInput } from "./quantity-input.ts";

/**
 * `<cart-page>`: loads the Shopper's Cart and shows its items, each with an editable quantity
 * and a remove button, the Coupon field, and the Subtotal, Discount and Total; or the empty
 * Cart message. Every change redraws the page from the Cart the API returns.
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
    const change: Change = async (button, request) => {
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

    this.replaceChildren(
      feedback,
      table,
      createCouponSection(cart, feedback, change),
      createSummary(cart),
    );
  }
}

type Change = (button: HTMLButtonElement, request: () => Promise<Cart>) => Promise<void>;

/** The applied Coupon with its remove button, if any, and the field to apply one. */
function createCouponSection(cart: Cart, feedback: HTMLElement, change: Change): HTMLElement {
  const section = document.createElement("section");
  section.className = "cart-coupon";

  if (cart.coupon !== null) {
    const applied = createTextElement(
      "p",
      "cart-coupon-applied",
      `Cupom aplicado: ${describeCoupon(cart.coupon)} `,
    );
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remover cupom";
    remove.addEventListener("click", async () => {
      await change(remove, () => removeCoupon(cart.id));
    });
    applied.append(remove);
    section.append(applied);
  }

  const form = document.createElement("form");
  form.className = "cart-coupon-form";
  form.noValidate = true;
  const label = document.createElement("label");
  label.textContent = "Código do cupom ";
  const input = document.createElement("input");
  input.type = "text";
  input.name = "coupon";
  input.autocomplete = "off";
  label.append(input);
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = "Aplicar cupom";
  form.append(label, apply);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const check = validateCouponCode(input.value);
    if (!check.valid) {
      showError(feedback, check.message);
      return;
    }
    await change(apply, () => applyCoupon(cart.id, check.code));
  });
  section.append(form);
  return section;
}

/** Subtotal, Discount and Total, all computed by the server. */
function createSummary(cart: Cart): HTMLElement {
  const summary = document.createElement("div");
  summary.className = "cart-summary";
  summary.append(
    createTextElement("p", "cart-subtotal", `Subtotal: ${formatPrice(cart.subtotalCents)}`),
    createTextElement("p", "cart-discount", `Desconto: ${formatPrice(cart.discountCents)}`),
    createTextElement("p", "cart-total", `Total: ${formatPrice(cart.totalCents)}`),
  );
  return summary;
}

function createItemRow(
  cartId: string,
  item: CartItem,
  feedback: HTMLElement,
  change: Change,
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
