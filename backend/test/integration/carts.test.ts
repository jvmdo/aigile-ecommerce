import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.ts";
import { createDatabase } from "../../src/db/connection.ts";
import { carts, products } from "../../src/db/schema.ts";
import { createTestClock } from "../support/test-clock.ts";
import { requireTestDatabaseUrl } from "../support/test-database-url.ts";

const testDatabaseUrl = requireTestDatabaseUrl();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHOPPER_ID = "0f8b6c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f";

describe("Carts API", () => {
  const database = createDatabase(testDatabaseUrl);
  const clock = createTestClock(new Date("2026-11-16T12:00:00Z"));
  const app = buildApp({ db: database.db, config: { logLevel: "silent" }, clock });

  async function emptyTables(): Promise<void> {
    await database.db.execute(sql`TRUNCATE carts, products CASCADE`);
  }

  beforeEach(async () => {
    clock.set(new Date("2026-11-16T12:00:00Z"));
    await emptyTables();
  });

  afterAll(async () => {
    await emptyTables();
    await app.close();
    await database.close();
  });

  describe("POST /api/carts", () => {
    it("responds 201 with an empty Cart", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carts",
        payload: { shopperId: SHOPPER_ID },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        id: expect.stringMatching(UUID),
        status: "empty",
        items: [],
        coupon: null,
        subtotalCents: 0,
        discountCents: 0,
        totalCents: 0,
      });
    });

    it("responds 400 VALIDATION_ERROR when the Shopper id is not a UUID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carts",
        payload: { shopperId: "42" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "A requisição é inválida.",
          details: [{ path: "body/shopperId", message: expect.any(String) }],
        },
      });
    });
  });

  describe("GET /api/carts/:id", () => {
    it("responds 200 with the Cart", async () => {
      const cartId = await createCart();

      const response = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: cartId,
        status: "empty",
        items: [],
        coupon: null,
        subtotalCents: 0,
        discountCents: 0,
        totalCents: 0,
      });
    });

    it("responds 404 CART_NOT_FOUND for a Cart that does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carts/7d2f0c4a-9b1e-4c3d-8a5f-6e7b8c9d0a1b",
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: "CART_NOT_FOUND", message: expect.any(String) },
      });
    });

    it("responds 400 VALIDATION_ERROR when the Cart id is not a UUID", async () => {
      const response = await app.inject({ method: "GET", url: "/api/carts/1" });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    });
  });

  describe("POST /api/carts/:id/items", () => {
    it("adds the first Product and moves the Cart from empty to with_items", async () => {
      const cartId = await createCart();
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 12 });

      const response = await addItem(cartId, { productId: mugId, quantity: 2 });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: cartId,
        status: "with_items",
        items: [
          {
            productId: mugId,
            name: "Caneca Esmaltada",
            unitPriceCents: 3990,
            quantity: 2,
            lineTotalCents: 7980,
          },
        ],
        coupon: null,
        subtotalCents: 7980,
        discountCents: 0,
        totalCents: 7980,
      });
    });

    it("lists the items in the order they entered the Cart, and GET returns them", async () => {
      const cartId = await createCart();
      const zebraId = await insertProduct({ name: "Zebra de Pelúcia", priceCents: 5000, stock: 5 });
      const anchorId = await insertProduct({
        name: "Âncora Decorativa",
        priceCents: 3333,
        stock: 5,
      });

      await addItem(cartId, { productId: zebraId, quantity: 1 });
      await addItem(cartId, { productId: anchorId, quantity: 3 });
      const response = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: "with_items",
        items: [
          { productId: zebraId, quantity: 1, lineTotalCents: 5000 },
          { productId: anchorId, quantity: 3, lineTotalCents: 9999 },
        ],
        subtotalCents: 14999,
        totalCents: 14999,
      });
    });

    it("adds to the quantity of a Product already in the Cart and keeps its original unit price", async () => {
      const cartId = await createCart();
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 12 });
      await addItem(cartId, { productId: mugId, quantity: 2 });
      await setProductPrice(mugId, 4500);

      const response = await addItem(cartId, { productId: mugId, quantity: 3 });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        items: [{ productId: mugId, unitPriceCents: 3990, quantity: 5, lineTotalCents: 19950 }],
        subtotalCents: 19950,
      });
    });

    it("keeps the unit price of a Cart Item when the Product's price changes later", async () => {
      const cartId = await createCart();
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 12 });
      await addItem(cartId, { productId: mugId, quantity: 1 });

      await setProductPrice(mugId, 1000);
      const response = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });

      expect(response.json()).toMatchObject({
        items: [{ productId: mugId, unitPriceCents: 3990, lineTotalCents: 3990 }],
        subtotalCents: 3990,
      });
    });

    it.each([
      { case: "quantity 0", quantity: 0, path: "body/quantity" },
      { case: "quantity 100", quantity: 100, path: "body/quantity" },
      { case: "a fractional quantity", quantity: 1.5, path: "body/quantity" },
      { case: "a non-numeric quantity", quantity: "dois", path: "body/quantity" },
    ])("responds 400 VALIDATION_ERROR for $case", async ({ quantity, path }) => {
      const cartId = await createCart();
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 200 });

      const response = await addItem(cartId, { productId: mugId, quantity });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "A requisição é inválida.",
          details: [{ path, message: expect.any(String) }],
        },
      });
    });

    it("responds 400 VALIDATION_ERROR when the Product id is not a UUID", async () => {
      const cartId = await createCart();

      const response = await addItem(cartId, { productId: "7", quantity: 1 });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: { code: "VALIDATION_ERROR", details: [{ path: "body/productId" }] },
      });
    });

    it("responds 400 VALIDATION_ERROR when the Cart id is not a UUID", async () => {
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 12 });

      const response = await addItem("abc", { productId: mugId, quantity: 1 });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: { code: "VALIDATION_ERROR", details: [{ path: "params/id" }] },
      });
    });

    it("accepts quantities 1 and 99, summing to exactly 99", async () => {
      const cartId = await createCart();
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 100, stock: 200 });
      const lampId = await insertProduct({ name: "Luminária", priceCents: 100, stock: 200 });

      await addItem(cartId, { productId: mugId, quantity: 98 });
      await addItem(cartId, { productId: mugId, quantity: 1 });
      const response = await addItem(cartId, { productId: lampId, quantity: 99 });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        items: [
          { productId: mugId, quantity: 99 },
          { productId: lampId, quantity: 99 },
        ],
      });
    });

    it("responds 422 QUANTITY_LIMIT_EXCEEDED when the sum with the existing item passes 99", async () => {
      const cartId = await createCart();
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 200 });
      await addItem(cartId, { productId: mugId, quantity: 60 });

      const response = await addItem(cartId, { productId: mugId, quantity: 40 });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({
        error: { code: "QUANTITY_LIMIT_EXCEEDED", message: expect.any(String) },
      });
      const cart = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });
      expect(cart.json()).toMatchObject({ items: [{ productId: mugId, quantity: 60 }] });
    });

    it("responds 409 INSUFFICIENT_STOCK when the first quantity exceeds the Stock", async () => {
      const cartId = await createCart();
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 2 });

      const response = await addItem(cartId, { productId: mugId, quantity: 3 });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: {
          code: "INSUFFICIENT_STOCK",
          message: expect.any(String),
          details: [{ productId: mugId, requested: 3, available: 2 }],
        },
      });
      const cart = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });
      expect(cart.json()).toMatchObject({ status: "empty", items: [] });
    });

    it("responds 409 INSUFFICIENT_STOCK when the summed quantity exceeds the Stock", async () => {
      const cartId = await createCart();
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 5 });
      await addItem(cartId, { productId: mugId, quantity: 3 });

      const response = await addItem(cartId, { productId: mugId, quantity: 3 });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({
        error: {
          code: "INSUFFICIENT_STOCK",
          details: [{ productId: mugId, requested: 6, available: 5 }],
        },
      });
    });

    it("responds 404 PRODUCT_NOT_FOUND for a Product that does not exist", async () => {
      const cartId = await createCart();

      const response = await addItem(cartId, {
        productId: "5c0e9a1b-3d2f-4e6a-9b8c-7d6e5f4a3b2c",
        quantity: 1,
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: "PRODUCT_NOT_FOUND", message: expect.any(String) },
      });
    });

    it("responds 404 CART_NOT_FOUND when adding to a Cart that does not exist", async () => {
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 12 });

      const response = await addItem("7d2f0c4a-9b1e-4c3d-8a5f-6e7b8c9d0a1b", {
        productId: mugId,
        quantity: 1,
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: "CART_NOT_FOUND", message: expect.any(String) },
      });
    });
  });

  // The API does not return this instant; it becomes observable through abandonment after
  // 24 h (ticket 08). Until then the test reads it from the database.
  describe("last change of the Cart", () => {
    async function lastChangedAt(cartId: string): Promise<Date | undefined> {
      const [row] = await database.db
        .select({ lastChangedAt: carts.lastChangedAt })
        .from(carts)
        .where(eq(carts.id, cartId));
      return row?.lastChangedAt;
    }

    it("is set from the injected clock on creation and on each item added, but not by GET", async () => {
      clock.set(new Date("2026-11-16T08:00:00Z"));
      const cartId = await createCart();
      expect(await lastChangedAt(cartId)).toEqual(new Date("2026-11-16T08:00:00Z"));

      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 12 });
      clock.set(new Date("2026-11-16T09:30:00Z"));
      await addItem(cartId, { productId: mugId, quantity: 1 });
      expect(await lastChangedAt(cartId)).toEqual(new Date("2026-11-16T09:30:00Z"));

      clock.set(new Date("2026-11-17T10:00:00Z"));
      await app.inject({ method: "GET", url: `/api/carts/${cartId}` });
      expect(await lastChangedAt(cartId)).toEqual(new Date("2026-11-16T09:30:00Z"));
    });

    it("is not changed by a rejected addition", async () => {
      clock.set(new Date("2026-11-16T08:00:00Z"));
      const cartId = await createCart();
      const mugId = await insertProduct({ name: "Caneca Esmaltada", priceCents: 3990, stock: 1 });

      clock.set(new Date("2026-11-16T09:00:00Z"));
      await addItem(cartId, { productId: mugId, quantity: 2 });

      expect(await lastChangedAt(cartId)).toEqual(new Date("2026-11-16T08:00:00Z"));
    });
  });

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

  async function setProductPrice(productId: string, priceCents: number): Promise<void> {
    await database.db.update(products).set({ priceCents }).where(eq(products.id, productId));
  }

  function addItem(cartId: string, payload: { productId: string; quantity: unknown }) {
    return app.inject({ method: "POST", url: `/api/carts/${cartId}/items`, payload });
  }

  async function createCart(): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/carts",
      payload: { shopperId: SHOPPER_ID },
    });
    return response.json<{ id: string }>().id;
  }
});
