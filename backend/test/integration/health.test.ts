import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.ts";
import { createDatabase } from "../../src/db/connection.ts";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must point at the ecommerce_test database");
}

/** Simulates a database restart: the server terminates every other session on the database. */
async function dropOtherConnectionsTo(connectionString: string): Promise<void> {
  const admin = new pg.Client({ connectionString });
  await admin.connect();
  try {
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()",
    );
    // Let the pool receive the termination notice on its idle clients.
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally {
    await admin.end();
  }
}

describe("GET /health", () => {
  describe("with the database reachable", () => {
    const database = createDatabase(testDatabaseUrl);
    const app = buildApp({ db: database.db, config: { logLevel: "silent" } });

    afterAll(async () => {
      await app.close();
      await database.close();
    });

    it("responds 200 { status: 'ok' }", async () => {
      const response = await app.inject({ method: "GET", url: "/health" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "ok" });
    });

    it("keeps responding 200 after the server drops the pooled connections", async () => {
      await app.inject({ method: "GET", url: "/health" });
      await dropOtherConnectionsTo(testDatabaseUrl);

      const response = await app.inject({ method: "GET", url: "/health" });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("with the database unreachable", () => {
    // Nothing listens on port 1, so every connection attempt is refused.
    const database = createDatabase("postgres://nobody:wrong@127.0.0.1:1/missing");
    const app = buildApp({ db: database.db, config: { logLevel: "silent" } });

    afterAll(async () => {
      await app.close();
      await database.close();
    });

    it("responds 503 in the error envelope", async () => {
      const response = await app.inject({ method: "GET", url: "/health" });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        error: { code: "DATABASE_UNAVAILABLE", message: expect.any(String) },
      });
    });
  });
});
