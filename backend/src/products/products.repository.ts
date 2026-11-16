import type { Product } from "@aigile/shared";
import { sql } from "drizzle-orm";
import type { Database } from "../db/connection.ts";
import { products } from "../db/schema.ts";

export type ProductsRepository = {
  findAll: () => Promise<Product[]>;
};

export function createProductsRepository(db: Database): ProductsRepository {
  return {
    findAll: () =>
      db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          priceCents: products.priceCents,
          stock: products.stock,
        })
        .from(products)
        // ICU collation: alphabetical for Portuguese names (case and accents do not push a
        // name to the end), independent of the database's default libc collation.
        .orderBy(sql`${products.name} COLLATE "pt-BR-x-icu"`),
  };
}
