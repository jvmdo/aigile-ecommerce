import type { ProductListResponse } from "@aigile/shared";

/** The API answered with a non-2xx status, or could not be reached at all. Messages are diagnostics, not shown to the shopper. */
export class ApiError extends Error {}

/** Fetches every Product in the catalog, already ordered by name. */
export async function fetchProducts(): Promise<ProductListResponse> {
  let response: Response;
  try {
    response = await fetch("/api/products", { headers: { Accept: "application/json" } });
  } catch (cause) {
    throw new ApiError("The API could not be reached.", { cause });
  }
  if (!response.ok) {
    throw new ApiError(`The API responded ${response.status}.`);
  }
  return (await response.json()) as ProductListResponse;
}
