import type { CouponType } from "@aigile/shared";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.ts";
import { createDatabase } from "../../src/db/connection.ts";
import { coupons, orders, products } from "../../src/db/schema.ts";
import { createTestClock } from "../support/test-clock.ts";
import { requireTestDatabaseUrl } from "../support/test-database-url.ts";

const testDatabaseUrl = requireTestDatabaseUrl();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHOPPER_ID = "0f8b6c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f";
const NOW = new Date("2026-11-16T12:00:00Z");

describe("Orders API", () => {
  const database = createDatabase(testDatabaseUrl);
  const clock = createTestClock(NOW);
  const app = buildApp({ db: database.db, config: { logLevel: "silent" }, clock });

  async function emptyTables(): Promise<void> {
    await database.db.execute(sql`TRUNCATE orders, carts, products, coupons CASCADE`);
  }

  beforeEach(async () => {
    clock.set(NOW);
    await emptyTables();
  });

  afterAll(async () => {
    await emptyTables();
    await app.close();
    await database.close();
  });

  describe("POST /api/carts/:id/confirm", () => {
    it("responds 201 with the Order, copying the items, the money and the Coupon", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 3333, stock: 10 });
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 5 });
      await insertCoupon({ code: "DEZ", type: "percentage", value: 10 });
      const cartId = await createCart();
      await addItem(cartId, vaseId, 3);
      await addItem(cartId, mugId, 1);
      await applyCoupon(cartId, "DEZ");
      await checkout(cartId);
      clock.set(new Date("2026-11-16T12:05:00Z"));

      const response = await confirm(cartId);

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        id: expect.stringMatching(UUID),
        status: "created",
        items: [
          {
            productId: vaseId,
            name: "Vaso de Barro",
            unitPriceCents: 3333,
            quantity: 3,
            lineTotalCents: 9999,
          },
          {
            productId: mugId,
            name: "Caneca Esmaltada",
            unitPriceCents: 3990,
            quantity: 1,
            lineTotalCents: 3990,
          },
        ],
        coupon: { code: "DEZ", type: "percentage", value: 10 },
        subtotalCents: 13989,
        discountCents: 1398,
        totalCents: 12591,
        createdAt: "2026-11-16T12:05:00.000Z",
      });
    });

    it("takes the items off the Stock, moves the Cart to order_created and makes the Order readable", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      const cartId = await cartInCheckout([{ productId: vaseId, quantity: 2 }]);

      const confirmed = await confirm(cartId);

      expect(confirmed.statusCode).toBe(201);
      expect(confirmed.json()).toMatchObject({
        coupon: null,
        subtotalCents: 10000,
        discountCents: 0,
        totalCents: 10000,
      });
      expect(await stockOf(vaseId)).toBe(8);
      const cart = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });
      expect(cart.json()).toMatchObject({ status: "order_created" });
      const order = await app.inject({
        method: "GET",
        url: `/api/orders/${confirmed.json().id}`,
      });
      expect(order.statusCode).toBe(200);
      expect(order.json()).toEqual(confirmed.json());
    });

    it("responds 409 INVALID_CART_TRANSITION outside checkout, including a second confirmation", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      const emptyCartId = await createCart();
      const withItemsCartId = await createCart();
      await addItem(withItemsCartId, vaseId, 1);
      const confirmedCartId = await cartInCheckout([{ productId: vaseId, quantity: 1 }]);
      expect((await confirm(confirmedCartId)).statusCode).toBe(201);

      const cases = [
        [emptyCartId, "empty"],
        [withItemsCartId, "with_items"],
        [confirmedCartId, "order_created"],
      ] as const;
      for (const [cartId, status] of cases) {
        const response = await confirm(cartId);
        expect(response.statusCode).toBe(409);
        expect(response.json()).toEqual({
          error: {
            code: "INVALID_CART_TRANSITION",
            message: expect.any(String),
            details: { status },
          },
        });
      }
      expect(await stockOf(vaseId)).toBe(9);
      expect(await orderCount()).toBe(1);
    });

    it("responds 404 CART_NOT_FOUND for a Cart that does not exist", async () => {
      const response = await confirm("7d2f0c4a-9b1e-4c3d-8a5f-6e7b8c9d0a1b");

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: "CART_NOT_FOUND", message: expect.any(String) },
      });
    });

    it("responds 400 VALIDATION_ERROR when the Cart id is not a UUID", async () => {
      const response = await confirm("1");

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    });

    it("responds 409 INSUFFICIENT_STOCK listing every short Product, and changes nothing", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 10 });
      const lampId = await insertProduct({ name: "Luminária", priceCents: 9000, stock: 10 });
      const cartId = await cartInCheckout([
        { productId: vaseId, quantity: 3 },
        { productId: mugId, quantity: 2 },
        { productId: lampId, quantity: 4 },
      ]);
      // Other purchases took Stock after these items entered the Cart.
      await setStock(vaseId, 2);
      await setStock(lampId, 0);

      const response = await confirm(cartId);

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: {
          code: "INSUFFICIENT_STOCK",
          message: expect.any(String),
          details: expect.arrayContaining([
            { productId: vaseId, requested: 3, available: 2 },
            { productId: lampId, requested: 4, available: 0 },
          ]),
        },
      });
      expect(response.json().error.details).toHaveLength(2);
      expect(await stockOf(mugId)).toBe(10);
      expect(await stockOf(vaseId)).toBe(2);
      expect(await stockOf(lampId)).toBe(0);
      const cart = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });
      expect(cart.json()).toMatchObject({ status: "checkout" });
      expect(await orderCount()).toBe(0);
    });

    it("confirms once the Stock is back, after a refusal for lack of it", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      const cartId = await cartInCheckout([{ productId: vaseId, quantity: 3 }]);
      await setStock(vaseId, 2);
      expect((await confirm(cartId)).statusCode).toBe(409);

      await setStock(vaseId, 3);
      const response = await confirm(cartId);

      expect(response.statusCode).toBe(201);
      expect(await stockOf(vaseId)).toBe(0);
    });

    it("responds 422 COUPON_EXPIRED when the Coupon expired after it was applied, and changes nothing", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      await insertCoupon({
        code: "DEZ",
        type: "percentage",
        value: 10,
        expiresAt: new Date("2026-11-16T18:00:00Z"),
      });
      const cartId = await cartInCheckout([{ productId: vaseId, quantity: 2 }], "DEZ");
      clock.set(new Date("2026-11-16T18:00:00Z"));

      const response = await confirm(cartId);

      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({
        error: { code: "COUPON_EXPIRED", message: expect.any(String) },
      });
      expect(await stockOf(vaseId)).toBe(10);
      const cart = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });
      expect(cart.json()).toMatchObject({
        status: "checkout",
        coupon: { code: "DEZ", type: "percentage", value: 10 },
      });
      expect(await orderCount()).toBe(0);
    });

    it("keeps the Order's copy of the Coupon when the Coupon changes later", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      await insertCoupon({ code: "MENOS25", type: "fixed", value: 2500 });
      const cartId = await cartInCheckout([{ productId: vaseId, quantity: 2 }], "MENOS25");
      const confirmed = await confirm(cartId);

      await database.db
        .update(coupons)
        .set({ type: "percentage", value: 50 })
        .where(eq(coupons.code, "MENOS25"));
      const order = await app.inject({
        method: "GET",
        url: `/api/orders/${confirmed.json().id}`,
      });

      expect(order.json()).toMatchObject({
        coupon: { code: "MENOS25", type: "fixed", value: 2500 },
        subtotalCents: 10000,
        discountCents: 2500,
        totalCents: 7500,
      });
    });

    it("never sells the last unit twice: of two simultaneous confirmations, exactly one creates an Order", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 1 });
      const firstCartId = await cartInCheckout([{ productId: vaseId, quantity: 1 }]);
      const secondCartId = await cartInCheckout(
        [{ productId: vaseId, quantity: 1 }],
        undefined,
        "5c7e2a91-3b4d-4e6f-9a8b-1c2d3e4f5a6b",
      );

      const responses = await Promise.all([confirm(firstCartId), confirm(secondCartId)]);

      const statuses = responses.map((response) => response.statusCode).sort();
      expect(statuses).toEqual([201, 409]);
      const refused = responses.find((response) => response.statusCode === 409);
      expect(refused?.json()).toEqual({
        error: {
          code: "INSUFFICIENT_STOCK",
          message: expect.any(String),
          details: [{ productId: vaseId, requested: 1, available: 0 }],
        },
      });
      expect(await stockOf(vaseId)).toBe(0);
      expect(await orderCount()).toBe(1);
    });
  });

  describe("GET /api/orders/:id", () => {
    it("responds 404 ORDER_NOT_FOUND for an Order that does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/orders/7d2f0c4a-9b1e-4c3d-8a5f-6e7b8c9d0a1b",
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: "ORDER_NOT_FOUND", message: expect.any(String) },
      });
    });

    it("responds 400 VALIDATION_ERROR when the Order id is not a UUID", async () => {
      const response = await app.inject({ method: "GET", url: "/api/orders/1" });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    });
  });

  describe("single-use Coupon per Shopper", () => {
    it("responds 409 COUPON_ALREADY_USED when applying a Coupon the Shopper already used in an Order", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      await insertCoupon({ code: "DEZ", type: "percentage", value: 10 });
      const firstCartId = await cartInCheckout([{ productId: vaseId, quantity: 1 }], "DEZ");
      expect((await confirm(firstCartId)).statusCode).toBe(201);
      const secondCartId = await createCart();
      await addItem(secondCartId, vaseId, 1);

      const response = await app.inject({
        method: "PUT",
        url: `/api/carts/${secondCartId}/coupon`,
        payload: { code: "dez" },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: { code: "COUPON_ALREADY_USED", message: expect.any(String) },
      });
      const cart = await app.inject({ method: "GET", url: `/api/carts/${secondCartId}` });
      expect(cart.json()).toMatchObject({ status: "with_items", coupon: null });
    });

    it("responds 409 COUPON_ALREADY_USED when confirming a second Cart that took the Coupon before the first Order, and changes nothing", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      await insertCoupon({ code: "DEZ", type: "percentage", value: 10 });
      const firstCartId = await cartInCheckout([{ productId: vaseId, quantity: 1 }], "DEZ");
      const secondCartId = await cartInCheckout([{ productId: vaseId, quantity: 2 }], "DEZ");
      expect((await confirm(firstCartId)).statusCode).toBe(201);

      const response = await confirm(secondCartId);

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: { code: "COUPON_ALREADY_USED", message: expect.any(String) },
      });
      expect(await stockOf(vaseId)).toBe(9);
      const cart = await app.inject({ method: "GET", url: `/api/carts/${secondCartId}` });
      expect(cart.json()).toMatchObject({ status: "checkout", coupon: { code: "DEZ" } });
      expect(await orderCount()).toBe(1);
    });

    it("lets one of two simultaneous confirmations of the same Shopper with the same Coupon create an Order", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      await insertCoupon({ code: "DEZ", type: "percentage", value: 10 });
      const firstCartId = await cartInCheckout([{ productId: vaseId, quantity: 2 }], "DEZ");
      const secondCartId = await cartInCheckout([{ productId: vaseId, quantity: 2 }], "DEZ");

      const responses = await Promise.all([confirm(firstCartId), confirm(secondCartId)]);

      const statuses = responses.map((response) => response.statusCode).sort();
      expect(statuses).toEqual([201, 409]);
      const refused = responses.find((response) => response.statusCode === 409);
      expect(refused?.json()).toEqual({
        error: { code: "COUPON_ALREADY_USED", message: expect.any(String) },
      });
      expect(await stockOf(vaseId)).toBe(8);
      expect(await orderCount()).toBe(1);
    });

    it("lets another Shopper apply and confirm with the same Coupon", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      await insertCoupon({ code: "DEZ", type: "percentage", value: 10 });
      const firstCartId = await cartInCheckout([{ productId: vaseId, quantity: 1 }], "DEZ");
      expect((await confirm(firstCartId)).statusCode).toBe(201);
      const otherCartId = await cartInCheckout(
        [{ productId: vaseId, quantity: 1 }],
        "DEZ",
        "5c7e2a91-3b4d-4e6f-9a8b-1c2d3e4f5a6b",
      );

      const response = await confirm(otherCartId);

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        coupon: { code: "DEZ", type: "percentage", value: 10 },
        subtotalCents: 5000,
        discountCents: 500,
        totalCents: 4500,
      });
      expect(await orderCount()).toBe(2);
    });
  });

  describe("Cart with an Order created", () => {
    it("refuses every change with 409 INVALID_CART_TRANSITION", async () => {
      const vaseId = await insertProduct({ name: "Vaso de Barro", priceCents: 5000, stock: 10 });
      await insertCoupon({ code: "DEZ", type: "percentage", value: 10 });
      const cartId = await cartInCheckout([{ productId: vaseId, quantity: 2 }], "DEZ");
      expect((await confirm(cartId)).statusCode).toBe(201);

      const attempts = [
        {
          method: "POST",
          url: `/api/carts/${cartId}/items`,
          payload: { productId: vaseId, quantity: 1 },
        },
        { method: "PATCH", url: `/api/carts/${cartId}/items/${vaseId}`, payload: { quantity: 1 } },
        { method: "DELETE", url: `/api/carts/${cartId}/items/${vaseId}` },
        { method: "PUT", url: `/api/carts/${cartId}/coupon`, payload: { code: "DEZ" } },
        { method: "DELETE", url: `/api/carts/${cartId}/coupon` },
        { method: "POST", url: `/api/carts/${cartId}/checkout` },
        { method: "POST", url: `/api/carts/${cartId}/edit` },
        { method: "POST", url: `/api/carts/${cartId}/abandon` },
      ] as const;
      for (const attempt of attempts) {
        const response = await app.inject(attempt);
        expect(response.statusCode, `${attempt.method} ${attempt.url}`).toBe(409);
        expect(response.json()).toEqual({
          error: {
            code: "INVALID_CART_TRANSITION",
            message: expect.any(String),
            details: { status: "order_created" },
          },
        });
      }
      const cart = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });
      expect(cart.json()).toMatchObject({
        status: "order_created",
        items: [{ productId: vaseId, quantity: 2 }],
        coupon: { code: "DEZ" },
      });
    });
  });

  /** A Cart in checkout with these items and, optionally, a Coupon applied. */
  async function cartInCheckout(
    items: { productId: string; quantity: number }[],
    couponCode?: string,
    shopperId = SHOPPER_ID,
  ): Promise<string> {
    const cartId = await createCart(shopperId);
    for (const { productId, quantity } of items) {
      await addItem(cartId, productId, quantity);
    }
    if (couponCode !== undefined) {
      await applyCoupon(cartId, couponCode);
    }
    await checkout(cartId);
    return cartId;
  }

  async function stockOf(productId: string): Promise<number | undefined> {
    const response = await app.inject({ method: "GET", url: "/api/products" });
    return response
      .json<{ id: string; stock: number }[]>()
      .find((product) => product.id === productId)?.stock;
  }

  async function setStock(productId: string, stock: number): Promise<void> {
    await database.db.update(products).set({ stock }).where(eq(products.id, productId));
  }

  /** The API lists no Orders, so whether one was created is read from the table. */
  async function orderCount(): Promise<number> {
    return database.db.$count(orders);
  }

  async function insertProduct(product: {
    name: string;
    priceCents: number;
    stock: number;
  }): Promise<string> {
    const [row] = await database.db.insert(products).values(product).returning({ id: products.id });
    if (row === undefined) {
      throw new Error("the Product was not inserted");
    }
    return row.id;
  }

  async function insertCoupon(coupon: {
    code: string;
    type: CouponType;
    value: number;
    expiresAt?: Date;
  }): Promise<void> {
    await database.db
      .insert(coupons)
      .values({ expiresAt: new Date("2026-12-31T23:59:59Z"), ...coupon });
  }

  async function createCart(shopperId = SHOPPER_ID): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/carts",
      payload: { shopperId },
    });
    return response.json<{ id: string }>().id;
  }

  async function addItem(cartId: string, productId: string, quantity: number): Promise<void> {
    await expectOk(
      app.inject({
        method: "POST",
        url: `/api/carts/${cartId}/items`,
        payload: { productId, quantity },
      }),
    );
  }

  async function applyCoupon(cartId: string, code: string): Promise<void> {
    await expectOk(
      app.inject({ method: "PUT", url: `/api/carts/${cartId}/coupon`, payload: { code } }),
    );
  }

  async function checkout(cartId: string): Promise<void> {
    await expectOk(app.inject({ method: "POST", url: `/api/carts/${cartId}/checkout` }));
  }

  function confirm(cartId: string) {
    return app.inject({ method: "POST", url: `/api/carts/${cartId}/confirm` });
  }

  /** Setup steps must succeed, or the test would assert on the wrong situation. */
  async function expectOk(request: Promise<{ statusCode: number; body: string }>): Promise<void> {
    const response = await request;
    if (response.statusCode !== 200) {
      throw new Error(`setup step responded ${response.statusCode}: ${response.body}`);
    }
  }
});
