import { type Static, Type } from "@sinclair/typebox";
import { Uuid } from "./uuid.ts";

/** A Product as the API returns it. Money is integer cents (ADR 0005); ids are UUIDs (ADR 0006). */
export const Product = Type.Object({
  id: Uuid,
  name: Type.String(),
  description: Type.String(),
  priceCents: Type.Integer({ minimum: 0 }),
  stock: Type.Integer({ minimum: 0 }),
});

export type Product = Static<typeof Product>;

/** `GET /api/products`: every Product, ordered by name. */
export const ProductListResponse = Type.Array(Product);

export type ProductListResponse = Static<typeof ProductListResponse>;
