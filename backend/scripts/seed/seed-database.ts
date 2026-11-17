import { Faker, base, en, pt_BR } from "@faker-js/faker";
import { count, eq, isNotNull, sql } from "drizzle-orm";
import { createCartsRepository } from "../../src/carts/carts.repository.ts";
import { type CartsService, createCartsService } from "../../src/carts/carts.service.ts";
import type { Clock } from "../../src/clock.ts";
import type { Database } from "../../src/db/connection.ts";
import {
  cartItems,
  carts,
  coupons as couponsTable,
  orderItems,
  orders,
  products as productsTable,
} from "../../src/db/schema.ts";
import { createInTransaction } from "../../src/db/transaction.ts";
import { createOrdersRepository } from "../../src/orders/orders.repository.ts";
import { createOrdersService } from "../../src/orders/orders.service.ts";
import { createProductsRepository } from "../../src/products/products.repository.ts";
import { generateCoupons, generateProducts } from "./catalog.ts";
import { type CartPlan, type Journey, planJourneys } from "./journeys.ts";

export type SeedSize = {
  products: number;
  coupons: number;
  shoppers: number;
};

export const defaultSeedSize: SeedSize = { products: 300, coupons: 40, shoppers: 1000 };

export type SeedOptions = {
  /** The instant the seed runs; every generated date is relative to it. */
  now: Date;
  size?: SeedSize;
};

export type SeedSummary = {
  counts: {
    products: number;
    coupons: number;
    shoppers: number;
    carts: Record<string, number>;
    cartItems: number;
    orders: number;
    ordersWithCoupon: number;
    orderItems: number;
  };
};

/** Fixed, so every run generates the same data relative to `now`. */
const FAKER_SEED = 20261117;
/** Shoppers whose Carts run at the same time; each has its own clock. */
const CONCURRENCY = 8;

/**
 * Empties the Products, Coupons, Carts and Orders and fills them with synthetic data: the
 * catalog and the Coupons are inserted directly (they have no API), and every Cart and Order
 * goes through the Cart Service with a clock set to each step's instant, so they follow the
 * same rules as the API.
 */
export async function seedDatabase(
  db: Database,
  { now, size = defaultSeedSize }: SeedOptions,
): Promise<SeedSummary> {
  const faker = new Faker({ locale: [pt_BR, en, base] });
  faker.seed(FAKER_SEED);

  const productSeeds = generateProducts(faker, size.products);
  const couponSeeds = generateCoupons(faker, size.coupons, now);
  const plan = planJourneys(faker, {
    products: productSeeds,
    coupons: couponSeeds,
    shoppers: size.shoppers,
    now,
  });

  await db.execute(sql`TRUNCATE orders, carts, products, coupons CASCADE`);
  const inserted = await db
    .insert(productsTable)
    .values(productSeeds.map(({ forJourneys: _, ...product }) => product))
    .returning({ id: productsTable.id, name: productsTable.name });
  // Matched by name (unique in the catalog), not by the order RETURNING happens to use.
  const idsByName = new Map(inserted.map((row) => [row.name, row.id]));
  const productIds = productSeeds.map((product) => idsByName.get(product.name) ?? "");
  await db.insert(couponsTable).values(couponSeeds.map(({ forJourneys: _, ...coupon }) => coupon));

  let next = 0;
  const worker = async () => {
    const clock = createSettableClock(now);
    const service = createSeedCartsService(db, clock);
    while (next < plan.journeys.length) {
      const journey = plan.journeys[next++];
      if (journey !== undefined) {
        await runJourney(db, service, clock, journey, productIds);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  for (const change of plan.catalogChanges) {
    const id = productIds[change.product];
    if (id === undefined) continue;
    await db
      .update(productsTable)
      .set(change.kind === "price" ? { priceCents: change.priceCents } : { stock: change.stock })
      .where(eq(productsTable.id, id));
  }

  return { counts: await countRows(db, plan.journeys.length) };
}

function createSettableClock(start: Date): Clock & { set: (instant: Date) => void } {
  let current = start;
  return {
    now: () => current,
    set: (instant) => {
      current = instant;
    },
  };
}

/** The same Cart Service the app builds (`buildApp`), with the seed's clock. */
function createSeedCartsService(db: Database, clock: Clock): CartsService {
  return createCartsService({
    carts: createCartsRepository(db),
    products: createProductsRepository(db),
    orders: createOrdersService(createOrdersRepository(db)),
    clock,
    inTransaction: createInTransaction(db),
  });
}

async function runJourney(
  db: Database,
  service: CartsService,
  clock: { set: (instant: Date) => void },
  journey: Journey,
  productIds: string[],
): Promise<void> {
  for (const cart of journey.carts) {
    await runCart(db, service, clock, journey.shopperId, cart, productIds);
  }
}

async function runCart(
  db: Database,
  service: CartsService,
  clock: { set: (instant: Date) => void },
  shopperId: string,
  plan: CartPlan,
  productIds: string[],
): Promise<void> {
  let cartId = "";
  const productId = (index: number) => {
    const id = productIds[index];
    if (id === undefined) throw new Error(`No Product at index ${index}`);
    return id;
  };
  for (const { at, action } of plan.steps) {
    clock.set(at);
    try {
      switch (action.kind) {
        case "create": {
          cartId = (await service.createCart(shopperId)).id;
          if (plan.fixedId !== undefined) {
            // Still empty and referenced by nothing: the demonstration Cart takes its fixed id.
            await db.update(carts).set({ id: plan.fixedId }).where(eq(carts.id, cartId));
            cartId = plan.fixedId;
          }
          break;
        }
        case "get":
          await service.getCart(cartId);
          break;
        case "add":
          await service.addItem(cartId, {
            productId: productId(action.product),
            quantity: action.quantity,
          });
          break;
        case "update":
          await service.updateItemQuantity(cartId, productId(action.product), action.quantity);
          break;
        case "remove":
          await service.removeItem(cartId, productId(action.product));
          break;
        case "applyCoupon":
          await service.applyCoupon(cartId, action.code);
          break;
        case "removeCoupon":
          await service.removeCoupon(cartId);
          break;
        case "checkout":
          await service.checkout(cartId);
          break;
        case "edit":
          await service.edit(cartId);
          break;
        case "abandon":
          await service.abandon(cartId);
          break;
        case "confirm":
          await service.confirm(cartId);
          break;
      }
    } catch (error) {
      // The plan only asks for what the rules allow: a refusal here is a bug, in the plan or in the Service.
      throw new Error(
        `Seed step ${action.kind} at ${at.toISOString()} failed for Cart ${cartId} of Shopper ${shopperId}`,
        { cause: error },
      );
    }
  }
}

async function countRows(db: Database, shoppers: number): Promise<SeedSummary["counts"]> {
  const total = async (
    table:
      | typeof productsTable
      | typeof couponsTable
      | typeof cartItems
      | typeof orders
      | typeof orderItems,
  ) => (await db.select({ total: count() }).from(table))[0]?.total ?? 0;
  const byStatus = await db
    .select({ status: carts.status, total: count() })
    .from(carts)
    .groupBy(carts.status)
    .orderBy(carts.status);
  const [withCoupon] = await db
    .select({ total: count() })
    .from(orders)
    .where(isNotNull(orders.couponCode));
  return {
    products: await total(productsTable),
    coupons: await total(couponsTable),
    shoppers,
    carts: Object.fromEntries(byStatus.map((row) => [row.status, row.total])),
    cartItems: await total(cartItems),
    orders: await total(orders),
    ordersWithCoupon: withCoupon?.total ?? 0,
    orderItems: await total(orderItems),
  };
}
