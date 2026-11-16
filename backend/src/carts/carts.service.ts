import {
  type AddCartItemBody,
  type Cart,
  type InsufficientStockDetail,
  MAX_ITEM_QUANTITY,
  type Product,
} from "@aigile/shared";
import type { Clock } from "../clock.ts";
import { DomainError } from "../domain-error.ts";
import type { ProductsRepository } from "../products/products.repository.ts";
import { type CartAction, invalidTransition, nextStatus } from "./cart-transitions.ts";
import type { CartChange, CartRecord, CartsRepository, CouponRecord } from "./carts.repository.ts";

export type CartsService = {
  createCart: (shopperId: string) => Promise<Cart>;
  getCart: (id: string) => Promise<Cart>;
  addItem: (cartId: string, item: AddCartItemBody) => Promise<Cart>;
  updateItemQuantity: (cartId: string, productId: string, quantity: number) => Promise<Cart>;
  removeItem: (cartId: string, productId: string) => Promise<Cart>;
  applyCoupon: (cartId: string, code: string) => Promise<Cart>;
  removeCoupon: (cartId: string) => Promise<Cart>;
  /** Locks the items for review: with_items → checkout. */
  checkout: (cartId: string) => Promise<Cart>;
  /** Unlocks the items: checkout → with_items. */
  edit: (cartId: string) => Promise<Cart>;
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
      return toCart({ id, shopperId, status: "empty", items: [], coupon: null });
    },

    getCart: async (id) => toCart(await findCart(carts, id)),

    addItem: async (cartId, { productId, quantity }) => {
      const cart = await findCart(carts, cartId);
      const status = nextStatus(cart.status, "addItem");
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
      assertInStock(product, resultingQuantity);
      const written = await carts.addItem(
        { cartId, productId, quantity, unitPriceCents: product.priceCents },
        { from: cart.status, status, changedAt: clock.now() },
      );
      await assertWritten(written, cartId);
      return toCart(await findCart(carts, cartId));
    },

    updateItemQuantity: async (cartId, productId, quantity) => {
      const cart = await findCart(carts, cartId);
      const status = nextStatus(cart.status, "updateItemQuantity");
      assertInCart(cart, productId);
      const product = await products.findById(productId);
      if (product === null) {
        // A Cart Item always references an existing Product (foreign key).
        throw new Error(`Product ${productId} of a Cart Item does not exist`);
      }
      assertInStock(product, quantity);
      const written = await carts.updateItemQuantity({ cartId, productId }, quantity, {
        from: cart.status,
        status,
        changedAt: clock.now(),
      });
      await assertWritten(written, cartId);
      return toCart(await findCart(carts, cartId));
    },

    removeItem: async (cartId, productId) => {
      const cart = await findCart(carts, cartId);
      const removesLastItem = cart.items.length === 1 && cart.items[0]?.productId === productId;
      const action: CartAction = removesLastItem ? "removeLastItem" : "removeItem";
      const status = nextStatus(cart.status, action);
      assertInCart(cart, productId);
      const change: CartChange = { from: cart.status, status, changedAt: clock.now() };
      if (removesLastItem) {
        // An empty Cart never carries a Coupon (FRD, "Cart Items").
        change.couponId = null;
      }
      await assertWritten(await carts.removeItem({ cartId, productId }, change), cartId);
      return toCart(await findCart(carts, cartId));
    },

    applyCoupon: async (cartId, code) => {
      const cart = await findCart(carts, cartId);
      const status = nextStatus(cart.status, "applyCoupon");
      const coupon = await carts.findCouponByCode(code.toUpperCase());
      if (coupon === null) {
        throw new DomainError("COUPON_NOT_FOUND", "Cupom não encontrado.");
      }
      const now = clock.now();
      if (now >= coupon.expiresAt) {
        throw new DomainError("COUPON_EXPIRED", "Este cupom expirou.");
      }
      const change = { from: cart.status, status, changedAt: now };
      await assertWritten(await carts.setCoupon(cartId, coupon.id, change), cartId);
      return toCart(await findCart(carts, cartId));
    },

    removeCoupon: async (cartId) => {
      const cart = await findCart(carts, cartId);
      const status = nextStatus(cart.status, "removeCoupon");
      // Removing when there is no Coupon has no effect, not even on the last change.
      if (cart.coupon === null) {
        return toCart(cart);
      }
      const change = { from: cart.status, status, changedAt: clock.now() };
      await assertWritten(await carts.setCoupon(cartId, null, change), cartId);
      return toCart(await findCart(carts, cartId));
    },

    checkout: (cartId) => transition(cartId, "checkout"),

    edit: (cartId) => transition(cartId, "edit"),
  };

  /** Moves the Cart along the table for an action that touches nothing but its status. */
  async function transition(cartId: string, action: CartAction): Promise<Cart> {
    const cart = await findCart(carts, cartId);
    const status = nextStatus(cart.status, action);
    const change = { from: cart.status, status, changedAt: clock.now() };
    await assertWritten(await carts.recordChange(cartId, change), cartId);
    return toCart(await findCart(carts, cartId));
  }

  /**
   * A write that found the Cart no longer in the status it was checked against lost a race
   * with another request (say, adding an item while the checkout starts): it is refused as a
   * transition from the status the Cart is in now.
   */
  async function assertWritten(written: boolean, cartId: string): Promise<void> {
    if (!written) {
      throw invalidTransition((await findCart(carts, cartId)).status);
    }
  }
}

async function findCart(carts: CartsRepository, id: string): Promise<CartRecord> {
  const cart = await carts.findById(id);
  if (cart === null) {
    throw new DomainError("CART_NOT_FOUND", "Carrinho não encontrado.");
  }
  return cart;
}

function assertInCart(cart: CartRecord, productId: string): void {
  if (!cart.items.some((item) => item.productId === productId)) {
    throw new DomainError("CART_ITEM_NOT_FOUND", "Este produto não está no carrinho.");
  }
}

/** Rejects a quantity above the Product's current Stock; nothing is reserved (FRD, "Cart Items"). */
function assertInStock(product: Pick<Product, "id" | "stock">, requested: number): void {
  if (requested > product.stock) {
    const details: InsufficientStockDetail[] = [
      { productId: product.id, requested, available: product.stock },
    ];
    throw new DomainError("INSUFFICIENT_STOCK", "Estoque insuficiente.", details);
  }
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
  const coupon = record.coupon;
  const discountCents = coupon === null ? 0 : discountOf(coupon, subtotalCents);
  return {
    id: record.id,
    status: record.status,
    items,
    coupon: coupon === null ? null : { code: coupon.code, type: coupon.type, value: coupon.value },
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
  };
}

/** A percentage is rounded down to the cent; a fixed amount never exceeds the Subtotal. */
function discountOf(coupon: Pick<CouponRecord, "type" | "value">, subtotalCents: number): number {
  return coupon.type === "percentage"
    ? Math.floor((subtotalCents * coupon.value) / 100)
    : Math.min(coupon.value, subtotalCents);
}
