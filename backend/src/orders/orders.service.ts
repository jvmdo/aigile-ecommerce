import type { Order } from "@aigile/shared";
import { DomainError } from "../domain-error.ts";
import type { OrdersRepository } from "./orders.repository.ts";

export type OrdersService = {
  getOrder: (id: string) => Promise<Order>;
};

export function createOrdersService(orders: OrdersRepository): OrdersService {
  return {
    getOrder: async (id) => {
      const order = await orders.findById(id);
      if (order === null) {
        throw new DomainError("ORDER_NOT_FOUND", "Pedido não encontrado.");
      }
      return {
        id: order.id,
        status: order.status,
        items: order.items.map((item) => ({
          ...item,
          lineTotalCents: item.quantity * item.unitPriceCents,
        })),
        coupon: order.coupon,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        totalCents: order.totalCents,
        createdAt: order.createdAt.toISOString(),
      };
    },
  };
}
