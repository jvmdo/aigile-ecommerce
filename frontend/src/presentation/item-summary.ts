import type { CartItem, Order, OrderItem } from "@aigile/shared";
import { formatPrice } from "../domain/money.ts";
import { createTextElement } from "./dom.ts";

/** Classes are prefixed by the page (`cart-…`, `order-…`) so each page's tests and styles can target its own. */
export type SummaryPrefix = "cart" | "order";

type Item = CartItem | OrderItem;

/** The money fields a Cart and an Order share. */
type Money = Pick<Order, "subtotalCents" | "discountCents" | "totalCents">;

/** The header labels of an item table; an editable one adds an empty column for its buttons. */
export const ITEM_HEADERS = ["Produto", "Preço unitário", "Quantidade", "Subtotal do item"];

/** A table of items with its header row; rows are appended to the returned body. */
export function createItemTable(
  prefix: SummaryPrefix,
  headers: readonly string[],
): { table: HTMLTableElement; body: HTMLTableSectionElement } {
  const table = document.createElement("table");
  table.className = `${prefix}-items`;
  const headerRow = document.createElement("tr");
  for (const label of headers) {
    headerRow.append(createTextElement("th", "", label));
  }
  table.createTHead().append(headerRow);
  return { table, body: table.createTBody() };
}

/** An item that cannot change: its quantity is plain text, with no controls. */
export function createReadOnlyItemRow(prefix: SummaryPrefix, item: Item): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.className = `${prefix}-item`;
  row.append(
    createTextElement("td", `${prefix}-item-name`, item.name),
    createTextElement("td", `${prefix}-item-unit-price`, formatPrice(item.unitPriceCents)),
    createTextElement("td", `${prefix}-item-quantity`, String(item.quantity)),
    createTextElement("td", `${prefix}-item-line-total`, formatPrice(item.lineTotalCents)),
  );
  return row;
}

/** Subtotal, Discount and Total, all computed by the server. */
export function createSummary(prefix: SummaryPrefix, money: Money): HTMLElement {
  const summary = document.createElement("div");
  summary.className = `${prefix}-summary`;
  summary.append(
    createTextElement("p", `${prefix}-subtotal`, `Subtotal: ${formatPrice(money.subtotalCents)}`),
    createTextElement("p", `${prefix}-discount`, `Desconto: ${formatPrice(money.discountCents)}`),
    createTextElement("p", `${prefix}-total`, `Total: ${formatPrice(money.totalCents)}`),
  );
  return summary;
}
