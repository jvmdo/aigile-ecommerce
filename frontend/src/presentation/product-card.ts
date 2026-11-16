import type { Product } from "@aigile/shared";
import { addToCart } from "../api/carts.ts";
import { formatPrice } from "../domain/money.ts";
import { validateQuantity } from "../domain/quantity.ts";
import { SOLD_OUT_LABEL, formatStock, isSoldOut } from "../domain/stock.ts";
import { createTextElement } from "./dom.ts";
import { apiErrorMessage, createQuantityInput } from "./quantity-input.ts";

/**
 * `<product-card>`: one Product with its name, description, price and Stock, the sold-out
 * badge when it has no Stock, and a quantity field with "Adicionar ao carrinho" (disabled
 * when sold out).
 */
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
      children.push(createTextElement("p", "product-badge", SOLD_OUT_LABEL));
    }
    children.push(createAddToCartForm(product, soldOut));
    this.replaceChildren(...children);
  }
}

function createAddToCartForm(product: Product, soldOut: boolean): HTMLFormElement {
  const form = document.createElement("form");
  form.className = "add-to-cart";
  form.noValidate = true;

  const label = document.createElement("label");
  label.textContent = "Quantidade ";
  const input = createQuantityInput(1);
  input.disabled = soldOut;
  label.append(input);

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Adicionar ao carrinho";
  button.disabled = soldOut;

  const message = document.createElement("p");
  message.className = "add-to-cart-message";
  message.setAttribute("aria-live", "polite");

  const showMessage = (text: string, isError: boolean): void => {
    message.textContent = text;
    message.classList.toggle("add-to-cart-error", isError);
    if (isError) {
      message.setAttribute("role", "alert");
    } else {
      message.setAttribute("role", "status");
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const quantity = input.valueAsNumber;
    const check = validateQuantity(quantity, product.stock);
    if (!check.valid) {
      showMessage(check.message, true);
      return;
    }
    button.disabled = true;
    try {
      await addToCart({ productId: product.id, quantity });
      showMessage("Adicionado ao carrinho.", false);
    } catch (error) {
      showMessage(apiErrorMessage(error), true);
    } finally {
      button.disabled = false;
    }
  });

  form.append(label, button, message);
  return form;
}

customElements.define("product-card", ProductCard);
