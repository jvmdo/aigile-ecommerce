import type { Order } from "@aigile/shared";
import { requestJson } from "./http.ts";

/** The Order with this id; throws ApiError with `ORDER_NOT_FOUND` when there is none. */
export function fetchOrder(orderId: string): Promise<Order> {
  return requestJson<Order>("GET", `/api/orders/${encodeURIComponent(orderId)}`);
}
