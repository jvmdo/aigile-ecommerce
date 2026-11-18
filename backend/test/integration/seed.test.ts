import type { Cart, Product } from "@aigile/shared";
import { count, isNotNull, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demoShoppers } from "../../scripts/seed/demo-shoppers.ts";
import { seedDatabase, seedDatabaseIfEmpty } from "../../scripts/seed/seed-database.ts";
import { buildApp } from "../../src/app.ts";
import { createDatabase } from "../../src/db/connection.ts";
import { carts, orders, products } from "../../src/db/schema.ts";
import { createTestClock } from "../support/test-clock.ts";
import { requireTestDatabaseUrl } from "../support/test-database-url.ts";

const testDatabaseUrl = requireTestDatabaseUrl();

const SEEDED_AT = new Date("2026-11-17T12:00:00Z");
// A reduced volume: the demonstration Shoppers and the edge cases do not depend on it.
const SIZE = { products: 40, coupons: 15, shoppers: 40 };

describe("seed", () => {
  const database = createDatabase(testDatabaseUrl);
  // The API is used a minute after the seed ran.
  const clock = createTestClock(new Date("2026-11-17T12:01:00Z"));
  const app = buildApp({ db: database.db, config: { logLevel: "silent" }, clock });

  beforeAll(async () => {
    await seedDatabase(database.db, { now: SEEDED_AT, size: SIZE });
  }, 60_000);

  afterAll(async () => {
    await database.db.execute(sql`TRUNCATE orders, carts, products, coupons CASCADE`);
    await app.close();
    await database.close();
  });

  async function getCart(cartId: string): Promise<{ statusCode: number; cart: Cart }> {
    const response = await app.inject({ method: "GET", url: `/api/carts/${cartId}` });
    return { statusCode: response.statusCode, cart: response.json() };
  }

  async function listProducts(): Promise<Product[]> {
    return (await app.inject({ method: "GET", url: "/api/products" })).json();
  }

  describe("catalog", () => {
    it("lists the requested number of Products", async () => {
      expect(await listProducts()).toHaveLength(40);
    });

    it("includes the edge cases: Stock 0, Stock 1, a 1-cent price, a high price and an empty description", async () => {
      const products = await listProducts();

      expect(products.some((product) => product.stock === 0)).toBe(true);
      expect(products.some((product) => product.stock === 1)).toBe(true);
      expect(products.some((product) => product.priceCents === 1)).toBe(true);
      expect(products.some((product) => product.priceCents >= 1_000_000)).toBe(true);
      expect(products.some((product) => product.description === "")).toBe(true);
      expect(products.some((product) => product.description !== "")).toBe(true);
      expect(products.every((product) => product.priceCents >= 1)).toBe(true);
    });
  });

  describe("Carts and Orders", () => {
    it("stores Carts in each of the five Cart Status", async () => {
      const rows = await database.db
        .select({ status: carts.status, total: count() })
        .from(carts)
        .groupBy(carts.status);

      expect(rows.map((row) => row.status).sort()).toEqual([
        "abandoned",
        "checkout",
        "empty",
        "order_created",
        "with_items",
      ]);
    });

    it("creates Orders with and without a Coupon", async () => {
      const [withCoupon] = await database.db
        .select({ total: count() })
        .from(orders)
        .where(isNotNull(orders.couponCode));
      const [withoutCoupon] = await database.db
        .select({ total: count() })
        .from(orders)
        .where(isNull(orders.couponCode));

      expect(withCoupon?.total).toBeGreaterThan(0);
      expect(withoutCoupon?.total).toBeGreaterThan(0);
    });
  });

  describe("demonstration Shoppers", () => {
    it("with items: one Cart Item of quantity 99 and one whose unit price is no longer the Product's", async () => {
      const { statusCode, cart } = await getCart(demoShoppers.withItems.cartId);
      const prices = new Map(
        (await listProducts()).map((product) => [product.id, product.priceCents]),
      );

      expect(statusCode).toBe(200);
      expect(cart.status).toBe("with_items");
      expect(cart.items.some((item) => item.quantity === 99)).toBe(true);
      expect(cart.items.some((item) => item.unitPriceCents !== prices.get(item.productId))).toBe(
        true,
      );
    });

    it("checkout with a Coupon that expired after it was applied: confirming responds 422 COUPON_EXPIRED", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/carts/${demoShoppers.checkoutExpiredCoupon.cartId}/confirm`,
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe("COUPON_EXPIRED");
    });

    it("checkout asking for more than the Stock: confirming responds 409 INSUFFICIENT_STOCK", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/carts/${demoShoppers.checkoutShortStock.cartId}/confirm`,
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe("INSUFFICIENT_STOCK");
    });

    it("Coupon already used by the Shopper: applying BEMVINDO10 responds 409 COUPON_ALREADY_USED", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/carts/${demoShoppers.couponAlreadyUsed.cartId}/coupon`,
        payload: { code: "bemvindo10" },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe("COUPON_ALREADY_USED");
    });

    it("idle for days: still stored with items, abandoned when it is read", async () => {
      const [stored] = await database.db
        .select({ status: carts.status })
        .from(carts)
        .where(sql`${carts.id} = ${demoShoppers.idle.cartId}`);
      expect(stored?.status).toBe("with_items");

      const { cart } = await getCart(demoShoppers.idle.cartId);

      expect(cart.status).toBe("abandoned");
    });

    it("100% Coupon in checkout: Total zero, and confirming creates the Order", async () => {
      const { cart } = await getCart(demoShoppers.fullDiscount.cartId);
      expect(cart.status).toBe("checkout");
      expect(cart.coupon).toEqual({ code: "CORTESIA100", type: "percentage", value: 100 });
      expect(cart.subtotalCents).toBeGreaterThan(0);
      expect(cart.totalCents).toBe(0);

      const response = await app.inject({
        method: "POST",
        url: `/api/carts/${demoShoppers.fullDiscount.cartId}/confirm`,
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().totalCents).toBe(0);
    });

    it("fixed Coupon above the Subtotal: the Discount stops at the Subtotal", async () => {
      const { cart } = await getCart(demoShoppers.fixedOverSubtotal.cartId);

      expect(cart.status).toBe("with_items");
      expect(cart.coupon).toEqual({ code: "VALE500", type: "fixed", value: 50000 });
      expect(cart.discountCents).toBe(cart.subtotalCents);
      expect(cart.totalCents).toBe(0);
    });

    it("empty and explicitly abandoned Carts", async () => {
      expect((await getCart(demoShoppers.empty.cartId)).cart.status).toBe("empty");
      expect((await getCart(demoShoppers.abandoned.cartId)).cart.status).toBe("abandoned");
    });
  });

  describe("running it again", () => {
    it("recreates the same state: the same catalog and the same number of Carts and Orders", async () => {
      // The tests above confirmed an Order, so the state to compare against is a fresh run.
      const summary = await seedDatabase(database.db, { now: SEEDED_AT, size: SIZE });
      const catalog = (await listProducts()).map(({ id: _id, ...product }) => product);

      const again = await seedDatabase(database.db, { now: SEEDED_AT, size: SIZE });

      expect((await listProducts()).map(({ id: _id, ...product }) => product)).toEqual(catalog);
      expect(again.counts).toEqual(summary.counts);
      expect((await getCart(demoShoppers.empty.cartId)).statusCode).toBe(200);
    }, 120_000);
  });
  // Runs last: it empties the database the blocks above read.
  describe("only when the database has no Products (first docker compose up)", () => {
    async function productCount(): Promise<number> {
      const [row] = await database.db.select({ value: count() }).from(products);
      return row?.value ?? 0;
    }

    it("skips, changing nothing, when there are Products", async () => {
      const before = await productCount();

      const summary = await seedDatabaseIfEmpty(database.db, { now: SEEDED_AT, size: SIZE });

      expect(summary).toBeNull();
      expect(before).toBe(40);
      expect(await productCount()).toBe(40);
    });

    it("seeds an empty database", async () => {
      await database.db.execute(sql`TRUNCATE orders, carts, products, coupons CASCADE`);

      const summary = await seedDatabaseIfEmpty(database.db, { now: SEEDED_AT, size: SIZE });

      expect(summary?.counts.products).toBe(40);
      expect(await productCount()).toBe(40);
    }, 60_000);
  });
});
