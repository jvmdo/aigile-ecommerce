import { MAX_ITEM_QUANTITY } from "@aigile/shared";
import type { Faker } from "@faker-js/faker";
import { type CouponSeed, type ProductSeed, edgeProducts } from "./catalog.ts";
import { demoCouponCodes, demoShoppers } from "./demo-shoppers.ts";

/**
 * What a Shopper does with a Cart, step by step, as calls to the Cart Service. Products are
 * referenced by their index in the catalog, since the database generates their ids.
 */
export type CartAction =
  | { kind: "create" }
  | { kind: "get" }
  | { kind: "add"; product: number; quantity: number }
  | { kind: "update"; product: number; quantity: number }
  | { kind: "remove"; product: number }
  | { kind: "applyCoupon"; code: string }
  | { kind: "removeCoupon" }
  | { kind: "checkout" }
  | { kind: "edit" }
  | { kind: "abandon" }
  | { kind: "confirm" };

export type CartStep = { at: Date; action: CartAction };

export type CartPlan = {
  /** Set for the demonstration Carts, whose id must stay the same across runs. */
  fixedId?: string;
  steps: CartStep[];
};

/** A Shopper's Carts in the order they used them; each one ends before the next starts. */
export type Journey = { shopperId: string; carts: CartPlan[] };

/** A change made after the Carts, as if by someone the system does not model (another sale, a new price). */
export type CatalogChange =
  | { kind: "price"; product: number; priceCents: number }
  | { kind: "stock"; product: number; stock: number };

export type JourneyPlan = {
  journeys: Journey[];
  catalogChanges: CatalogChange[];
};

/** How a Cart ends. The stale ones stop changing more than 24 hours before the seed runs. */
type Outcome =
  | "order"
  | "abandonExplicit"
  | "abandonByTime"
  | "withItemsRecent"
  | "withItemsStale"
  | "checkoutRecent"
  | "checkoutStale"
  | "empty";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Plans every Cart of the generated Shoppers and of the demonstration Shoppers. The plan
 * keeps its own ledger of Stock in which every Cart, confirmed or not, holds what it asked
 * for: the Carts then run in any order without one of them finding the Stock short.
 */
export function planJourneys(
  faker: Faker,
  {
    products,
    coupons,
    shoppers,
    now,
  }: {
    products: ProductSeed[];
    coupons: CouponSeed[];
    shoppers: number;
    now: Date;
  },
): JourneyPlan {
  const ledger = products.map((product) => product.stock);
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);
  const index = (seed: ProductSeed) => products.findIndex((product) => product.name === seed.name);

  /** A Product the Carts may use with `quantity` still free in the ledger, which it then holds. */
  function takeProduct(
    quantity: number,
    exclude: Set<number>,
    maxPriceCents = Number.POSITIVE_INFINITY,
  ): number | null {
    const candidates = products
      .map((product, i) => ({ product, i }))
      .filter(
        ({ product, i }) =>
          product.forJourneys &&
          !exclude.has(i) &&
          (ledger[i] ?? 0) >= quantity &&
          product.priceCents <= maxPriceCents &&
          withinMoneyRange(product, quantity),
      );
    if (candidates.length === 0) {
      return null;
    }
    const { i } = faker.helpers.arrayElement(candidates);
    ledger[i] = (ledger[i] ?? 0) - quantity;
    return i;
  }

  const journeyCoupons = coupons.filter((coupon) => coupon.forJourneys);

  /** The steps of one Cart from `start`, ending in `outcome`. Returns the steps and the products it holds. */
  function planCart(
    start: Date,
    outcome: Outcome,
    usedCoupons: Set<string>,
    nextStart: Date | null,
  ): CartStep[] {
    let time = start.getTime();
    const steps: CartStep[] = [];
    const step = (action: CartAction) => {
      steps.push({ at: new Date(time), action });
      time += faker.number.int({ min: 1, max: 8 }) * MINUTE;
    };
    step({ kind: "create" });

    if (outcome === "empty") {
      // Some empty Carts once had an item that the Shopper removed.
      if (faker.datatype.boolean(0.25)) {
        const product = takeProduct(1, new Set());
        if (product !== null) {
          step({ kind: "add", product, quantity: 1 });
          step({ kind: "remove", product });
        }
      }
      return steps;
    }

    const items = new Map<number, number>();
    const itemCount = faker.helpers.weightedArrayElement([
      { weight: 35, value: 1 },
      { weight: 30, value: 2 },
      { weight: 20, value: 3 },
      { weight: 10, value: 4 },
      { weight: 5, value: faker.number.int({ min: 5, max: 6 }) },
    ]);
    for (let n = 0; n < itemCount; n++) {
      const quantity = faker.helpers.weightedArrayElement([
        { weight: 60, value: 1 },
        { weight: 25, value: 2 },
        { weight: 15, value: faker.number.int({ min: 3, max: 5 }) },
      ]);
      const product = takeProduct(quantity, new Set(items.keys()));
      if (product === null) {
        continue;
      }
      items.set(product, quantity);
      step({ kind: "add", product, quantity });
    }
    if (items.size === 0) {
      return steps;
    }

    // The Shopper changes their mind about a quantity, or drops an item.
    if (faker.datatype.boolean(0.2)) {
      const [product, quantity] = faker.helpers.arrayElement([...items]);
      const wanted = faker.number.int({ min: 1, max: 6 });
      const extra = wanted - quantity;
      const affordable = extra <= 0 || (ledger[product] ?? 0) >= extra;
      if (wanted !== quantity && affordable && withinMoneyRange(products[product], wanted)) {
        if (extra > 0) ledger[product] = (ledger[product] ?? 0) - extra;
        items.set(product, wanted);
        step({ kind: "update", product, quantity: wanted });
      }
    }
    if (items.size > 1 && faker.datatype.boolean(0.1)) {
      const product = faker.helpers.arrayElement([...items.keys()]);
      items.delete(product);
      step({ kind: "remove", product });
    }

    // A Coupon valid well past the end of this Cart's activity and not used by the Shopper yet.
    if (faker.datatype.boolean(0.35)) {
      const validUntil = time + 2 * HOUR;
      const candidates = journeyCoupons.filter(
        (coupon) => coupon.expiresAt.getTime() > validUntil && !usedCoupons.has(coupon.code),
      );
      if (candidates.length > 0) {
        const coupon = faker.helpers.arrayElement(candidates);
        step({ kind: "applyCoupon", code: coupon.code });
        if (faker.datatype.boolean(0.08)) {
          step({ kind: "removeCoupon" });
        } else if (outcome === "order") {
          usedCoupons.add(coupon.code);
        }
      }
    }

    const reachesCheckout =
      outcome === "order" ||
      outcome === "checkoutRecent" ||
      outcome === "checkoutStale" ||
      ((outcome === "abandonExplicit" || outcome === "abandonByTime") &&
        faker.datatype.boolean(0.3));
    if (reachesCheckout) {
      step({ kind: "checkout" });
      if (faker.datatype.boolean(0.1)) {
        step({ kind: "edit" });
        step({ kind: "checkout" });
      }
    }
    if (outcome === "order") step({ kind: "confirm" });
    if (outcome === "abandonExplicit") step({ kind: "abandon" });
    if (outcome === "abandonByTime") {
      // Abandoned only when the Shopper comes back to it, 24 hours or more later.
      const back =
        nextStart ?? new Date(time + faker.number.int({ min: 25 * HOUR, max: 48 * HOUR }));
      steps.push({ at: back, action: { kind: "get" } });
    }
    return steps;
  }

  const journeys: Journey[] = [];
  for (let s = 0; s < shoppers; s++) {
    const shopperId = faker.string.uuid();
    const lastOutcome = faker.helpers.weightedArrayElement<Outcome>([
      { weight: 30, value: "order" },
      { weight: 7, value: "abandonExplicit" },
      { weight: 5, value: "abandonByTime" },
      { weight: 12, value: "withItemsRecent" },
      { weight: 10, value: "withItemsStale" },
      { weight: 8, value: "checkoutRecent" },
      { weight: 5, value: "checkoutStale" },
      { weight: 13, value: "empty" },
    ]);
    const lastStart = at(lastCartOffset(faker, lastOutcome));
    const earlierCount = faker.helpers.weightedArrayElement([
      { weight: 60, value: 0 },
      { weight: 28, value: 1 },
      { weight: 12, value: 2 },
    ]);
    // Earlier Carts go back in time from the last one, at least two days apart.
    const starts: Date[] = [lastStart];
    for (let n = 0; n < earlierCount; n++) {
      const previous = starts[0] ?? lastStart;
      const start = new Date(
        previous.getTime() - faker.number.int({ min: 2 * DAY, max: 20 * DAY }),
      );
      if (start.getTime() < now.getTime() - 120 * DAY) break;
      starts.unshift(start);
    }
    const usedCoupons = new Set<string>();
    const carts: CartPlan[] = starts.map((start, n) => {
      const isLast = n === starts.length - 1;
      const outcome = isLast
        ? lastOutcome
        : faker.helpers.weightedArrayElement<Outcome>([
            { weight: 80, value: "order" },
            { weight: 10, value: "abandonExplicit" },
            { weight: 10, value: "abandonByTime" },
          ]);
      // The Shopper comes back for the next Cart a minute before starting it.
      const nextStart = isLast ? null : new Date((starts[n + 1] ?? start).getTime() - MINUTE);
      return { steps: planCart(start, outcome, usedCoupons, nextStart) };
    });
    journeys.push({ shopperId, carts });
  }

  // Some Products in open Carts get a new price, so those Cart Items keep the old one.
  const openProducts = new Set<number>();
  for (const journey of journeys) {
    const last = journey.carts.at(-1);
    const lastAction = last?.steps.at(-1)?.action.kind;
    if (
      lastAction === "add" ||
      lastAction === "update" ||
      lastAction === "applyCoupon" ||
      lastAction === "removeCoupon" ||
      lastAction === "checkout" ||
      lastAction === "remove"
    ) {
      for (const { action } of last?.steps ?? []) {
        if (action.kind === "add") openProducts.add(action.product);
      }
    }
  }
  const repriced = faker.helpers.arrayElements(
    [...openProducts],
    Math.min(openProducts.size, Math.max(3, Math.round(shoppers / 80))),
  );
  const catalogChanges: CatalogChange[] = repriced.map((product) => ({
    kind: "price",
    product,
    priceCents: raise(faker, products[product]?.priceCents ?? 0),
  }));

  const demo = planDemonstrations(faker, { products, now, takeProduct, index });
  return {
    journeys: [...journeys, ...demo.journeys],
    catalogChanges: [...catalogChanges, ...demo.catalogChanges],
  };
}

/**
 * Very expensive Products only in single units, so no Order goes past the integer range of
 * its money columns (see "Achados" in docs/seeds-report.md).
 */
function withinMoneyRange(product: ProductSeed | undefined, quantity: number): boolean {
  return product !== undefined && (product.priceCents < 100_000 || quantity === 1);
}

/** When the last Cart of a Shopper starts, relative to the seed, given how it ends. */
function lastCartOffset(faker: Faker, outcome: Outcome): number {
  switch (outcome) {
    case "withItemsRecent":
    case "checkoutRecent":
      // Its last change stays under 24 hours old: still open when the seed finishes.
      return -faker.number.int({ min: 3 * HOUR, max: 22 * HOUR });
    case "withItemsStale":
    case "checkoutStale":
      return -faker.number.int({ min: 26 * HOUR, max: 20 * DAY });
    case "abandonByTime":
      // Room for the Shopper to come back 25 to 48 hours later, before the seed runs.
      return -faker.number.int({ min: 3 * DAY, max: 30 * DAY });
    case "empty":
      return -faker.number.int({ min: 1 * HOUR, max: 30 * DAY });
    default:
      return -faker.number.int({ min: 3 * HOUR, max: 60 * DAY });
  }
}

/** A new price 10 to 25% higher, still ending in 90 cents. */
function raise(faker: Faker, priceCents: number): number {
  const raised = Math.round((priceCents * faker.number.int({ min: 110, max: 125 })) / 100);
  return Math.max(priceCents + 100, Math.floor(raised / 100) * 100 + 90);
}

/** The Carts of the demonstration Shoppers (see `demo-shoppers.ts`), each ending just before the seed runs. */
function planDemonstrations(
  faker: Faker,
  {
    products,
    now,
    takeProduct,
    index,
  }: {
    products: ProductSeed[];
    now: Date;
    takeProduct: (quantity: number, exclude: Set<number>, maxPriceCents?: number) => number | null;
    index: (seed: ProductSeed) => number;
  },
): JourneyPlan {
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);
  const take = (quantity: number, maxPriceCents = 20_000, exclude = new Set<number>()) => {
    const product = takeProduct(quantity, exclude, maxPriceCents);
    if (product === null) {
      throw new Error("The catalog has no Product left for the demonstration Shoppers");
    }
    return product;
  };
  /** Steps a few minutes apart from `start`. */
  const steps = (start: number, actions: CartAction[]): CartStep[] =>
    actions.map((action, n) => ({ at: at(start + n * 3 * MINUTE), action }));

  const clip = index(edgeProducts.oneCent);
  const shortStock = index(edgeProducts.shortStock);
  // The clip may already be held by generated Carts; the demonstration needs 99 of them.
  if (clip < 0 || shortStock < 0 || (products[clip]?.stock ?? 0) < MAX_ITEM_QUANTITY) {
    throw new Error("The edge-case Products the demonstration Shoppers need are missing");
  }

  const repricedProduct = take(1);
  const expiredA = take(1);
  const expiredB = take(2, 20_000, new Set([expiredA]));
  const usedBefore = take(1);
  const usedNow = take(1);
  const idleA = take(2);
  const idleB = take(1, 20_000, new Set([idleA]));
  const fullA = take(1);
  const fullB = take(1, 20_000, new Set([fullA]));
  const fixedOver = take(1);
  const abandoned = take(1);

  const journeys: Journey[] = [
    {
      shopperId: demoShoppers.withItems.shopperId,
      carts: [
        {
          fixedId: demoShoppers.withItems.cartId,
          steps: steps(-2 * HOUR, [
            { kind: "create" },
            { kind: "add", product: clip, quantity: MAX_ITEM_QUANTITY },
            { kind: "add", product: repricedProduct, quantity: 1 },
          ]),
        },
      ],
    },
    {
      shopperId: demoShoppers.checkoutExpiredCoupon.shopperId,
      carts: [
        {
          fixedId: demoShoppers.checkoutExpiredCoupon.cartId,
          // Applied and checked out before the Coupon expired, an hour before the seed.
          steps: steps(-3 * HOUR, [
            { kind: "create" },
            { kind: "add", product: expiredA, quantity: 1 },
            { kind: "add", product: expiredB, quantity: 2 },
            { kind: "applyCoupon", code: demoCouponCodes.expiredAfterApplied },
            { kind: "checkout" },
          ]),
        },
      ],
    },
    {
      shopperId: demoShoppers.checkoutShortStock.shopperId,
      carts: [
        {
          fixedId: demoShoppers.checkoutShortStock.cartId,
          steps: steps(-3 * HOUR, [
            { kind: "create" },
            { kind: "add", product: shortStock, quantity: 3 },
            { kind: "checkout" },
          ]),
        },
      ],
    },
    {
      shopperId: demoShoppers.couponAlreadyUsed.shopperId,
      carts: [
        {
          steps: steps(-10 * DAY, [
            { kind: "create" },
            { kind: "add", product: usedBefore, quantity: 1 },
            { kind: "applyCoupon", code: demoCouponCodes.alreadyUsed },
            { kind: "checkout" },
            { kind: "confirm" },
          ]),
        },
        {
          fixedId: demoShoppers.couponAlreadyUsed.cartId,
          steps: steps(-1 * HOUR, [
            { kind: "create" },
            { kind: "add", product: usedNow, quantity: 1 },
          ]),
        },
      ],
    },
    {
      shopperId: demoShoppers.idle.shopperId,
      carts: [
        {
          fixedId: demoShoppers.idle.cartId,
          steps: steps(-3 * DAY, [
            { kind: "create" },
            { kind: "add", product: idleA, quantity: 2 },
            { kind: "add", product: idleB, quantity: 1 },
          ]),
        },
      ],
    },
    {
      shopperId: demoShoppers.fullDiscount.shopperId,
      carts: [
        {
          fixedId: demoShoppers.fullDiscount.cartId,
          steps: steps(-1 * HOUR, [
            { kind: "create" },
            { kind: "add", product: fullA, quantity: 1 },
            { kind: "add", product: fullB, quantity: 1 },
            { kind: "applyCoupon", code: demoCouponCodes.fullDiscount },
            { kind: "checkout" },
          ]),
        },
      ],
    },
    {
      shopperId: demoShoppers.fixedOverSubtotal.shopperId,
      carts: [
        {
          fixedId: demoShoppers.fixedOverSubtotal.cartId,
          // At most R$ 200,00 in a Cart, under the R$ 500,00 of the Coupon.
          steps: steps(-1 * HOUR, [
            { kind: "create" },
            { kind: "add", product: fixedOver, quantity: 1 },
            { kind: "applyCoupon", code: demoCouponCodes.fixedOverSubtotal },
          ]),
        },
      ],
    },
    {
      shopperId: demoShoppers.empty.shopperId,
      carts: [
        { fixedId: demoShoppers.empty.cartId, steps: steps(-30 * MINUTE, [{ kind: "create" }]) },
      ],
    },
    {
      shopperId: demoShoppers.abandoned.shopperId,
      carts: [
        {
          fixedId: demoShoppers.abandoned.cartId,
          steps: steps(-5 * HOUR, [
            { kind: "create" },
            { kind: "add", product: abandoned, quantity: 1 },
            { kind: "abandon" },
          ]),
        },
      ],
    },
  ];

  const repricedSeed = products[repricedProduct];
  return {
    journeys,
    catalogChanges: [
      {
        kind: "price",
        product: repricedProduct,
        priceCents: raise(faker, repricedSeed?.priceCents ?? 0),
      },
      // Another sale took the rest: the demonstration Cart asks for 3 and finds 1.
      { kind: "stock", product: shortStock, stock: 1 },
    ],
  };
}
