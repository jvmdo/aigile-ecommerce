import type { InsufficientStockDetail, Product } from "@aigile/shared";
import { and, eq, gte, sql } from "drizzle-orm";
import type { Queryable } from "../db/connection.ts";
import { products } from "../db/schema.ts";

export type ProductsRepository = {
  findAll: () => Promise<Product[]>;
  findById: (id: string) => Promise<Product | null>;
  /**
   * Takes each quantity off its Product's Stock with a conditional update that only applies
   * while the Stock covers it (ADR 0009), in ascending product id order so concurrent
   * confirmations lock the rows in the same order and cannot deadlock. Returns the items it
   * could not decrement, with the Stock they found; the others stay decremented, so the
   * caller runs this in a transaction and rolls it back when any item is returned.
   */
  decrementStock: (items: StockDecrement[]) => Promise<StockShortage[]>;
};

export type StockDecrement = {
  productId: string;
  quantity: number;
};

/** An item whose Product did not have the Stock to cover it. */
export type StockShortage = InsufficientStockDetail;

export function createProductsRepository(db: Queryable): ProductsRepository {
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

    decrementStock: async (items) => {
      const shortages: StockShortage[] = [];
      const ascending = [...items].sort((a, b) => (a.productId < b.productId ? -1 : 1));
      for (const { productId, quantity } of ascending) {
        // The `stock >= quantity` guard is the concurrency guarantee of ADR 0009: keep it in
        // this single statement, never as a read-check-write.
        const decremented = await db
          .update(products)
          .set({ stock: sql`${products.stock} - ${quantity}` })
          .where(and(eq(products.id, productId), gte(products.stock, quantity)))
          .returning({ id: products.id });
        if (decremented.length === 0) {
          const [product] = await db
            .select({ stock: products.stock })
            .from(products)
            .where(eq(products.id, productId));
          shortages.push({ productId, requested: quantity, available: product?.stock ?? 0 });
        }
      }
      return shortages;
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
