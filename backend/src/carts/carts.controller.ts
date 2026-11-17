import {
  AddCartItemBody,
  ApplyCouponBody,
  Cart,
  CartItemParams,
  CartParams,
  CreateCartBody,
  Order,
  UpdateCartItemBody,
} from "@aigile/shared";
import type { App } from "../app.ts";
import type { CartsService } from "./carts.service.ts";

export function registerCartRoutes(app: App, service: CartsService): void {
  app.post(
    "/api/carts",
    { schema: { body: CreateCartBody, response: { 201: Cart } } },
    async (request, reply) =>
      reply.code(201).send(await service.createCart(request.body.shopperId)),
  );

  app.get(
    "/api/carts/:id",
    { schema: { params: CartParams, response: { 200: Cart } } },
    async (request) => service.getCart(request.params.id),
  );

  app.post(
    "/api/carts/:id/items",
    { schema: { params: CartParams, body: AddCartItemBody, response: { 200: Cart } } },
    async (request) => service.addItem(request.params.id, request.body),
  );

  app.patch(
    "/api/carts/:id/items/:productId",
    { schema: { params: CartItemParams, body: UpdateCartItemBody, response: { 200: Cart } } },
    async ({ params, body }) =>
      service.updateItemQuantity(params.id, params.productId, body.quantity),
  );

  app.delete(
    "/api/carts/:id/items/:productId",
    { schema: { params: CartItemParams, response: { 200: Cart } } },
    async ({ params }) => service.removeItem(params.id, params.productId),
  );

  app.put(
    "/api/carts/:id/coupon",
    { schema: { params: CartParams, body: ApplyCouponBody, response: { 200: Cart } } },
    async ({ params, body }) => service.applyCoupon(params.id, body.code),
  );

  app.delete(
    "/api/carts/:id/coupon",
    { schema: { params: CartParams, response: { 200: Cart } } },
    async ({ params }) => service.removeCoupon(params.id),
  );

  app.post(
    "/api/carts/:id/checkout",
    { schema: { params: CartParams, response: { 200: Cart } } },
    async ({ params }) => service.checkout(params.id),
  );

  app.post(
    "/api/carts/:id/edit",
    { schema: { params: CartParams, response: { 200: Cart } } },
    async ({ params }) => service.edit(params.id),
  );

  app.post(
    "/api/carts/:id/confirm",
    { schema: { params: CartParams, response: { 201: Order } } },
    async ({ params }, reply) => reply.code(201).send(await service.confirm(params.id)),
  );
}
