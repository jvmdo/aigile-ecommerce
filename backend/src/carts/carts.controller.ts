import { AddCartItemBody, Cart, CartParams, CreateCartBody } from "@aigile/shared";
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
}
