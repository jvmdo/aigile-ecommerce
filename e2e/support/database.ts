import pg from "pg";

/** A Product row as the e2e tests insert it; the database generates the id. */
export type ProductRow = {
  name: string;
  description: string;
  priceCents: number;
  stock: number;
};

/** The e2e database connection string; fails fast when it is missing. */
function requireDatabaseUrl(): string {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error("E2E_DATABASE_URL must point at the database the e2e stack's api uses");
  }
  return url;
}

/** Sets a Product's Stock behind the frontend's back, as another purchase would. */
export async function setStock(productName: string, stock: number): Promise<void> {
  const client = new pg.Client({ connectionString: requireDatabaseUrl() });
  await client.connect();
  try {
    await client.query("UPDATE products SET stock = $1 WHERE name = $2", [stock, productName]);
  } finally {
    await client.end();
  }
}

/** A Coupon row as the e2e tests insert it; `code` must be in upper case, as the table requires. */
export type CouponRow = {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  expiresAt: Date;
};

/** Inserts a Coupon; Coupons have no API, they come from the seed or the tests. */
export async function insertCoupon({ code, type, value, expiresAt }: CouponRow): Promise<void> {
  const client = new pg.Client({ connectionString: requireDatabaseUrl() });
  await client.connect();
  try {
    await client.query(
      "INSERT INTO coupons (code, type, value, expires_at) VALUES ($1, $2, $3, $4)",
      [code, type, value, expiresAt],
    );
  } finally {
    await client.end();
  }
}

/** Replaces every Product in the e2e database with the given ones, and removes every Order, Cart and Coupon. */
export async function replaceProducts(products: ProductRow[]): Promise<void> {
  const client = new pg.Client({ connectionString: requireDatabaseUrl() });
  await client.connect();
  try {
    await client.query("BEGIN");
    // CASCADE also empties the tables that reference these (Cart Items, Order Items).
    await client.query("TRUNCATE orders, products, carts, coupons CASCADE");
    for (const { name, description, priceCents, stock } of products) {
      await client.query(
        "INSERT INTO products (name, description, price_cents, stock) VALUES ($1, $2, $3, $4)",
        [name, description, priceCents, stock],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}
