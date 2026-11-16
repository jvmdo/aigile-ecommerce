import { execFileSync } from "node:child_process";
import pg from "pg";
import { requireTestDatabaseUrl } from "./test-database-url.ts";

/** Migrates ecommerce_test with the same drizzle-kit migrations the `migrate` service applies, then empties every table. */
export default async function setup(): Promise<void> {
  const testDatabaseUrl = requireTestDatabaseUrl();

  execFileSync("npx", ["drizzle-kit", "migrate"], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  });

  const client = new pg.Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    );
    if (rows.length > 0) {
      const tables = rows.map(({ tablename }) => `"public"."${tablename}"`).join(", ");
      await client.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await client.end();
  }
}
