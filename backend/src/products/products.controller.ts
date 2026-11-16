import { ProductListResponse } from "@aigile/shared";
import type { App } from "../app.ts";
import type { ProductsService } from "./products.service.ts";

export function registerProductRoutes(app: App, service: ProductsService): void {
  app.get("/api/products", { schema: { response: { 200: ProductListResponse } } }, async () =>
    service.listProducts(),
  );
}
