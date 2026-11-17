import { Order, OrderParams } from "@aigile/shared";
import type { App } from "../app.ts";
import type { OrdersService } from "./orders.service.ts";

export function registerOrderRoutes(app: App, service: OrdersService): void {
  app.get(
    "/api/orders/:id",
    { schema: { params: OrderParams, response: { 200: Order } } },
    async ({ params }) => service.getOrder(params.id),
  );
}
