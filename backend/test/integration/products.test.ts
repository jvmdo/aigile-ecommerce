import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.ts";
import { systemClock } from "../../src/clock.ts";
import { createDatabase } from "../../src/db/connection.ts";
import { products } from "../../src/db/schema.ts";
import { requireTestDatabaseUrl } from "../support/test-database-url.ts";

const testDatabaseUrl = requireTestDatabaseUrl();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("GET /api/products", () => {
  const database = createDatabase(testDatabaseUrl);
  const app = buildApp({ db: database.db, config: { logLevel: "silent" }, clock: systemClock });

  beforeEach(async () => {
    await database.db.delete(products);
  });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  it("responds 200 with each Product's contract fields", async () => {
    await database.db.insert(products).values({
      name: "Caneca de cerâmica",
      description: "Caneca branca de 300 ml",
      priceCents: 3990,
      stock: 12,
    });

    const response = await app.inject({ method: "GET", url: "/api/products" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: expect.stringMatching(UUID),
        name: "Caneca de cerâmica",
        description: "Caneca branca de 300 ml",
        priceCents: 3990,
        stock: 12,
      },
    ]);
  });

  it("lists every Product ordered by name, ascending", async () => {
    await database.db.insert(products).values([
      { name: "Toalha de banho", priceCents: 5990, stock: 3 },
      { name: "Abajur de mesa", priceCents: 12900, stock: 1 },
      { name: "Moringa de barro", priceCents: 4500, stock: 8 },
    ]);

    const response = await app.inject({ method: "GET", url: "/api/products" });

    expect(response.statusCode).toBe(200);
    expect(response.json().map((product: { name: string }) => product.name)).toEqual([
      "Abajur de mesa",
      "Moringa de barro",
      "Toalha de banho",
    ]);
  });

  it("orders names alphabetically regardless of case and accents", async () => {
    await database.db.insert(products).values([
      { name: "Banana-passa", priceCents: 1200, stock: 5 },
      { name: "Água de coco", priceCents: 800, stock: 5 },
      { name: "abacaxi desidratado", priceCents: 1500, stock: 5 },
    ]);

    const response = await app.inject({ method: "GET", url: "/api/products" });

    expect(response.json().map((product: { name: string }) => product.name)).toEqual([
      "abacaxi desidratado",
      "Água de coco",
      "Banana-passa",
    ]);
  });

  it("responds 200 with an empty list when the catalog is empty", async () => {
    const response = await app.inject({ method: "GET", url: "/api/products" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("lists a Product with zero Stock as stock: 0", async () => {
    await database.db
      .insert(products)
      .values({ name: "Vaso esgotado", priceCents: 2500, stock: 0 });

    const response = await app.inject({ method: "GET", url: "/api/products" });

    expect(response.json()).toEqual([expect.objectContaining({ name: "Vaso esgotado", stock: 0 })]);
  });
});

describe("GET /api/products with the database unreachable", () => {
  // Nothing listens on port 1, so every connection attempt is refused.
  const database = createDatabase("postgres://nobody:wrong@127.0.0.1:1/missing");
  const app = buildApp({ db: database.db, config: { logLevel: "silent" }, clock: systemClock });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  it("responds 500 in the error envelope without leaking the cause", async () => {
    const response = await app.inject({ method: "GET", url: "/api/products" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor." },
    });
  });
});
