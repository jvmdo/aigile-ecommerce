import type { DomainErrorCode } from "@aigile/shared";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.ts";
import { systemClock } from "../../src/clock.ts";
import { createDatabase } from "../../src/db/connection.ts";
import { DomainError } from "../../src/domain-error.ts";
import { requireTestDatabaseUrl } from "../support/test-database-url.ts";

const testDatabaseUrl = requireTestDatabaseUrl();

describe("domain errors", () => {
  const database = createDatabase(testDatabaseUrl);
  const app = buildApp({ db: database.db, config: { logLevel: "silent" }, clock: systemClock });

  // Routes registered only here: they stand in for a Service that raises a domain error.
  app.get("/test/insufficient-stock", () => {
    throw new DomainError("INSUFFICIENT_STOCK", "Estoque insuficiente.", [
      { productId: "4b1f6a2e-0c1d-4f3e-9a5b-7c8d9e0f1a2b", requested: 5, available: 2 },
    ]);
  });
  app.get("/test/coupon-expired", () => {
    throw new DomainError("COUPON_EXPIRED", "O cupom expirou.");
  });
  app.get("/test/cart-not-found", () => {
    throw new DomainError("CART_NOT_FOUND", "Carrinho não encontrado.");
  });
  app.get("/test/unmapped", () => {
    throw new DomainError("NOT_A_REAL_CODE" as DomainErrorCode, "mensagem interna");
  });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  it("responds with the code's status and the envelope with details", async () => {
    const response = await app.inject({ method: "GET", url: "/test/insufficient-stock" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: "INSUFFICIENT_STOCK",
        message: "Estoque insuficiente.",
        details: [
          { productId: "4b1f6a2e-0c1d-4f3e-9a5b-7c8d9e0f1a2b", requested: 5, available: 2 },
        ],
      },
    });
  });

  it("omits details when the domain error has none", async () => {
    const response = await app.inject({ method: "GET", url: "/test/coupon-expired" });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: { code: "COUPON_EXPIRED", message: "O cupom expirou." },
    });
  });

  it("maps a not-found code to 404", async () => {
    const response = await app.inject({ method: "GET", url: "/test/cart-not-found" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "CART_NOT_FOUND", message: "Carrinho não encontrado." },
    });
  });

  it("responds 500 without leaking the message for a code with no status", async () => {
    const response = await app.inject({ method: "GET", url: "/test/unmapped" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor." },
    });
  });
});
