import type { ProductListResponse } from "@aigile/shared";
import { requestJson } from "./http.ts";

/** Fetches every Product in the catalog, already ordered by name. */
export function fetchProducts(): Promise<ProductListResponse> {
  return requestJson<ProductListResponse>("GET", "/api/products");
}
