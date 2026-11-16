import type { Product } from "@aigile/shared";
import type { ProductsRepository } from "./products.repository.ts";

export type ProductsService = {
  listProducts: () => Promise<Product[]>;
};

export function createProductsService(repository: ProductsRepository): ProductsService {
  return {
    listProducts: () => repository.findAll(),
  };
}
