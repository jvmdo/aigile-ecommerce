/** The ecommerce_test connection string; fails fast when it is missing. */
export function requireTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL must point at the ecommerce_test database");
  }
  return url;
}
