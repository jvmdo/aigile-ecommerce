import { defineConfig } from "drizzle-kit";

// `generate` needs no database; `migrate` (the compose `migrate` service and the
// integration-test setup) reads DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
