import type { Order } from "@aigile/shared";
import { ApiError } from "../api/http.ts";
import { fetchOrder } from "../api/orders.ts";
import { describeCoupon } from "../domain/coupon.ts";
import { errorMessage } from "../domain/error-messages.ts";
import { createTextElement } from "./dom.ts";
import {
  ITEM_HEADERS,
  createItemTable,
  createReadOnlyItemRow,
  createSummary,
} from "./item-summary.ts";

/**
 * `<order-page>`: the confirmation of the Order whose id is set in `orderId` before the page
 * is attached. Shows its items, Coupon, Subtotal, Discount and Total, and a link back to the
 * catalog.
 */
export class OrderPage extends HTMLElement {
  orderId = "";

  connectedCallback(): void {
    this.replaceChildren(createTextElement("p", "order-message", "Carregando o pedido…"));
    void this.load();
  }

  private async load(): Promise<void> {
    let order: Order;
    try {
      order = await fetchOrder(this.orderId);
    } catch (error) {
      // An id that is not a UUID is refused by validation: it names no Order either.
      const notFound =
        error instanceof ApiError &&
        (error.code === "ORDER_NOT_FOUND" || error.code === "VALIDATION_ERROR");
      const message = createTextElement(
        "p",
        "order-message order-error",
        notFound
          ? errorMessage("ORDER_NOT_FOUND")
          : "Não foi possível carregar o pedido agora. Tente novamente em alguns instantes.",
      );
      message.setAttribute("role", "alert");
      this.replaceChildren(message, createContinueLink());
      return;
    }
    this.showOrder(order);
  }

  private showOrder(order: Order): void {
    const intro = createTextElement("p", "order-created", "Seu pedido foi criado.");
    const { table, body } = createItemTable("order", ITEM_HEADERS);
    for (const item of order.items) {
      body.append(createReadOnlyItemRow("order", item));
    }
    const parts: HTMLElement[] = [intro, table];
    if (order.coupon !== null) {
      parts.push(createTextElement("p", "order-coupon", `Cupom: ${describeCoupon(order.coupon)}`));
    }
    parts.push(createSummary("order", order), createContinueLink());
    this.replaceChildren(...parts);
  }
}

function createContinueLink(): HTMLElement {
  const paragraph = document.createElement("p");
  const link = document.createElement("a");
  link.href = "#/";
  link.textContent = "Continuar comprando";
  paragraph.append(link);
  return paragraph;
}

customElements.define("order-page", OrderPage);
