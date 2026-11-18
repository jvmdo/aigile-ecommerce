// Fills the application database with synthetic data for demonstration (`make seed`).
// Everything already there (Products, Coupons, Carts, Orders) is deleted first.
// With --if-empty (the seed-initial service of `docker compose up`), it only seeds a database
// that has no Products yet, and otherwise leaves everything as it is.
import { createDatabase } from "../src/db/connection.ts";
import { seedDatabase, seedDatabaseIfEmpty } from "./seed/seed-database.ts";

const onlyIfEmpty = process.argv.includes("--if-empty");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL precisa apontar para o banco da aplicação.");
  process.exit(1);
}
const databaseName = new URL(databaseUrl).pathname.slice(1);
if (databaseName === "ecommerce_test") {
  // The integration tests own that database; the seed would wipe what they set up.
  console.error("O seed não roda no ecommerce_test, o banco dos testes de integração.");
  process.exit(1);
}

const database = createDatabase(databaseUrl);
const startedAt = performance.now();
try {
  const options = { now: new Date() };
  const summary = onlyIfEmpty
    ? await seedDatabaseIfEmpty(database.db, options)
    : await seedDatabase(database.db, options);
  if (summary === null) {
    console.log(`O database ${databaseName} já tem Products: seed inicial ignorado.`);
  } else {
    const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
    console.log(`Seed concluído em ${seconds}s no database ${databaseName}:`);
    console.log(JSON.stringify(summary.counts, null, 2));
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await database.close();
}
