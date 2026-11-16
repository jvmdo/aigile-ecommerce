import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.ts";
import { systemClock } from "../../src/clock.ts";
import { createDatabase } from "../../src/db/connection.ts";
import { requireTestDatabaseUrl } from "../support/test-database-url.ts";

const testDatabaseUrl = requireTestDatabaseUrl();

// The 400 for schema validation is covered by the first route with input (Cart feature).
describe("error envelope", () => {
  const database = createDatabase(testDatabaseUrl);
  const app = buildApp({ db: database.db, config: { logLevel: "silent" }, clock: systemClock });

  afterAll(async () => {
    await app.close();
    await database.close();
  });

  it("responds 404 in the error envelope for an unknown route", async () => {
    const response = await app.inject({ method: "GET", url: "/api/does-not-exist" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Recurso não encontrado." },
    });
  });
});
