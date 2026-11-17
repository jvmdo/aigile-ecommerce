import type { Cart, CartItem } from "@aigile/shared";
import {
  abandonCart,
  applyCoupon,
  checkoutCart,
  confirmCart,
  editCart,
  fetchCurrentCart,
  isAbandonedError,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from "../api/carts.ts";
import { ApiError } from "../api/http.ts";
import { type CartPageAction, allowedCartActions, cartStatusLabel } from "../domain/cart-status.ts";
import { describeCoupon, validateCouponCode } from "../domain/coupon.ts";
import { cartErrorMessage } from "../domain/error-messages.ts";
import { formatPrice } from "../domain/money.ts";
import { validateQuantity } from "../domain/quantity.ts";
import { createTextElement } from "./dom.ts";
import {
  ITEM_HEADERS,
  createItemTable,
  createReadOnlyItemRow,
  createSummary,
} from "./item-summary.ts";
import { apiErrorMessage, createQuantityInput } from "./quantity-input.ts";

/**
 * `<cart-page>`: loads the Shopper's Cart and shows its status, its items, the Coupon field,
 * the Subtotal, Discount and Total, and the buttons that move it along; or the empty Cart
 * message. Which controls appear follows the actions the status allows (Domain): with_items
 * edits the items and offers "Finalizar compra"; checkout shows them read-only and offers
 * "Voltar para editar" and "Confirmar pedido", which opens the Order's confirmation page.
 * "Abandonar carrinho" (with_items) gives the Cart up. A stored Cart found abandoned, on
 * loading or because a change was refused for it, shows "Seu carrinho expirou". Every change
 * redraws the page from the Cart the API returns.
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
    if (cart?.status === "abandoned") {
      this.showAbandoned();
      return;
    }
    if (cart === null || cart.items.length === 0) {
      this.showWithCatalogLink("cart-empty", "Seu carrinho está vazio.");
      return;
    }
    this.showCart(cart);
  }

  private readonly showAbandoned = (): void => {
    this.showWithCatalogLink("cart-abandoned", "Seu carrinho expirou.");
  };

  /** A message in place of the Cart, with a link back to the catalog. */
  private showWithCatalogLink(className: string, text: string): void {
    const message = createTextElement("p", `cart-message ${className}`, `${text} `);
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
        if (isAbandonedError(error)) {
          // Abandoned meanwhile (24 hours without a change): loading forgets it and says so.
          await this.load();
          return;
        }
        showError(feedback, apiErrorMessage(error));
      } finally {
        button.disabled = false;
      }
    };

    const actions = allowedCartActions(cart.status);
    const editItems = actions.includes("editItems");

    const { table, body } = createItemTable(
      "cart",
      editItems ? [...ITEM_HEADERS, ""] : ITEM_HEADERS,
    );
    for (const item of cart.items) {
      body.append(
        editItems
          ? createEditableItemRow(cart.id, item, feedback, change)
          : createReadOnlyItemRow("cart", item),
      );
    }

    const status = createTextElement("p", "cart-status", `Estado: ${cartStatusLabel(cart.status)}`);
    const parts: HTMLElement[] = [status, feedback, table];
    if (actions.includes("editCoupon")) {
      parts.push(createCouponSection(cart, feedback, change));
    }
    const transitions = createTransitions(cart, actions, change);
    if (actions.includes("confirm")) {
      transitions.append(createConfirmButton(cart, feedback, this.showAbandoned));
    }
    if (actions.includes("abandon")) {
      transitions.append(
        createAbandonButton(cart, feedback, {
          onAbandoned: () =>
            this.showWithCatalogLink("cart-given-up", "Você abandonou o carrinho."),
          onAlreadyAbandoned: this.showAbandoned,
        }),
      );
    }
    parts.push(createSummary("cart", cart), transitions);
    this.replaceChildren(...parts);
  }
}

/**
 * "Abandonar carrinho": gives the Cart up; the API forgets it, so the next addition starts a
 * new one. A Cart already abandoned by the 24 hours without a change shows that it expired.
 */
function createAbandonButton(
  cart: Cart,
  feedback: HTMLElement,
  { onAbandoned, onAlreadyAbandoned }: { onAbandoned: () => void; onAlreadyAbandoned: () => void },
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Abandonar carrinho";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await abandonCart(cart.id);
      onAbandoned();
    } catch (error) {
      if (isAbandonedError(error)) {
        onAlreadyAbandoned();
        return;
      }
      showError(feedback, apiErrorMessage(error));
      button.disabled = false;
    }
  });
  return button;
}

/**
 * "Confirmar pedido": creates the Order and opens its confirmation page. A refusal (Stock
 * taken by another purchase, expired Coupon) leaves the Cart in checkout and says why,
 * naming every short Product; a Cart abandoned meanwhile shows that it expired.
 */
function createConfirmButton(
  cart: Cart,
  feedback: HTMLElement,
  onAbandoned: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Confirmar pedido";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const order = await confirmCart(cart.id);
      location.hash = `#/pedido/${order.id}`;
    } catch (error) {
      if (isAbandonedError(error)) {
        onAbandoned();
        return;
      }
      const apiError = error instanceof ApiError ? error : undefined;
      showError(feedback, cartErrorMessage(apiError?.code, apiError?.details, cart.items));
      button.disabled = false;
    }
  });
  return button;
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

/** The buttons that move the Cart to another status, as far as its status allows. */
function createTransitions(
  cart: Cart,
  actions: readonly CartPageAction[],
  change: Change,
): HTMLElement {
  const section = document.createElement("div");
  section.className = "cart-transitions";
  const transitions: [CartPageAction, string, (cartId: string) => Promise<Cart>][] = [
    ["checkout", "Finalizar compra", checkoutCart],
    ["edit", "Voltar para editar", editCart],
  ];
  for (const [action, label, request] of transitions) {
    if (!actions.includes(action)) {
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", async () => {
      await change(button, () => request(cart.id));
    });
    section.append(button);
  }
  return section;
}

/** An item open for editing (with_items): editable quantity and a remove button. */
function createEditableItemRow(
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
