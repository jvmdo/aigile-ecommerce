import {
  type AddCartItemBody,
  type Cart,
  type InsufficientStockDetail,
  MAX_ITEM_QUANTITY,
} from "@aigile/shared";
import type { Clock } from "../clock.ts";
import { DomainError } from "../domain-error.ts";
import type { ProductsRepository } from "../products/products.repository.ts";
import type { CartRecord, CartsRepository } from "./carts.repository.ts";

export type CartsService = {
  createCart: (shopperId: string) => Promise<Cart>;
  getCart: (id: string) => Promise<Cart>;
  addItem: (cartId: string, item: AddCartItemBody) => Promise<Cart>;
};

export type CartsServiceDependencies = {
  carts: CartsRepository;
  products: ProductsRepository;
  clock: Clock;
};

export function createCartsService({
  carts,
  products,
  clock,
}: CartsServiceDependencies): CartsService {
  return {
    createCart: async (shopperId) => {
      const id = await carts.create(shopperId, clock.now());
      return toCart({ id, shopperId, status: "empty", items: [] });
    },

    getCart: async (id) => toCart(await findCart(carts, id)),

    addItem: async (cartId, { productId, quantity }) => {
      const cart = await findCart(carts, cartId);
      const product = await products.findById(productId);
      if (product === null) {
        throw new DomainError("PRODUCT_NOT_FOUND", "Produto não encontrado.");
      }
      const existing = cart.items.find((item) => item.productId === productId);
      const resultingQuantity = (existing?.quantity ?? 0) + quantity;
      if (resultingQuantity > MAX_ITEM_QUANTITY) {
        throw new DomainError(
          "QUANTITY_LIMIT_EXCEEDED",
          `A quantidade de um produto no carrinho não pode passar de ${MAX_ITEM_QUANTITY}.`,
        );
      }
      if (resultingQuantity > product.stock) {
        const details: InsufficientStockDetail[] = [
          { productId, requested: resultingQuantity, available: product.stock },
        ];
        throw new DomainError("INSUFFICIENT_STOCK", "Estoque insuficiente.", details);
      }
      await carts.addItem(
        { cartId, productId, quantity, unitPriceCents: product.priceCents },
        { status: "with_items", changedAt: clock.now() },
      );
      return toCart(await findCart(carts, cartId));
    },
  };
}

async function findCart(carts: CartsRepository, id: string): Promise<CartRecord> {
  const cart = await carts.findById(id);
  if (cart === null) {
    throw new DomainError("CART_NOT_FOUND", "Carrinho não encontrado.");
  }
  return cart;
}

/** Computes the money fields of the Cart the API returns (FRD, "Cálculo do dinheiro"). */
function toCart(record: CartRecord): Cart {
  const items = record.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
    lineTotalCents: item.quantity * item.unitPriceCents,
  }));
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  return {
    id: record.id,
    status: record.status,
    items,
    coupon: null,
    subtotalCents,
    discountCents: 0,
    totalCents: subtotalCents,
  };
}
