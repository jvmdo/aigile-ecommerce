import type { Product } from "@aigile/shared";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../db/connection.ts";
import { products } from "../db/schema.ts";

export type ProductsRepository = {
  findAll: () => Promise<Product[]>;
  findById: (id: string) => Promise<Product | null>;
};

export function createProductsRepository(db: Database): ProductsRepository {
  return {
    findAll: () =>
      db
        .select(productColumns)
        .from(products)
        // ICU collation: alphabetical for Portuguese names (case and accents do not push a
        // name to the end), independent of the database's default libc collation.
        .orderBy(sql`${products.name} COLLATE "pt-BR-x-icu"`),

    findById: async (id) => {
      const [product] = await db.select(productColumns).from(products).where(eq(products.id, id));
      return product ?? null;
    },
  };
}

const productColumns = {
  id: products.id,
  name: products.name,
  description: products.description,
  priceCents: products.priceCents,
  stock: products.stock,
};
