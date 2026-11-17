import type {
  AddCartItemBody,
  ApplyCouponBody,
  Cart,
  CreateCartBody,
  Order,
  UpdateCartItemBody,
} from "@aigile/shared";
import { readStored, removeStored, writeStored } from "./browser-storage.ts";
import { ApiError, requestJson } from "./http.ts";

/** The Shopper id, generated once per browser and never discarded (FRD, "Identidade do Shopper"). */
function shopperId(): string {
  const stored = readStored("shopperId");
  if (stored !== null) {
    return stored;
  }
  const generated = randomUuid();
  writeStored("shopperId", generated);
  return generated;
}

/**
 * A random (version 4) UUID. `crypto.randomUUID()` exists only in secure contexts (HTTPS or
 * localhost), so a store served over plain HTTP on any other host would fail without this;
 * `crypto.getRandomValues()` works everywhere.
 */
function randomUuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Whether the stored Cart can no longer be used: it does not exist, or it already became an
 * Order (a mutation then answers INVALID_CART_TRANSITION with `details.status`).
 */
function isStoredCartGone(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.code === "CART_NOT_FOUND") {
    return true;
  }
  const details = error.details as { status?: unknown } | undefined;
  return error.code === "INVALID_CART_TRANSITION" && details?.status === "order_created";
}

/**
 * The Shopper's current Cart, or null when there is none: no Cart yet, or the stored one no
 * longer exists or already became an Order, in which case it is forgotten.
 */
export async function fetchCurrentCart(): Promise<Cart | null> {
  const cartId = readStored("cartId");
  if (cartId === null) {
    return null;
  }
  let cart: Cart;
  try {
    cart = await requestJson<Cart>("GET", `/api/carts/${cartId}`);
  } catch (error) {
    if (isStoredCartGone(error)) {
      removeStored("cartId");
      return null;
    }
    throw error;
  }
  if (cart.status === "order_created") {
    removeStored("cartId");
    return null;
  }
  return cart;
}

async function createCart(): Promise<string> {
  const body: CreateCartBody = { shopperId: shopperId() };
  const cart = await requestJson<Cart>("POST", "/api/carts", body);
  writeStored("cartId", cart.id);
  return cart.id;
}

/**
 * Adds a Product to the Shopper's Cart, creating the Cart on the first addition. A stored
 * Cart that no longer exists, or already became an Order, is forgotten and replaced by a new one.
 */
export async function addToCart(item: AddCartItemBody): Promise<Cart> {
  const storedCartId = readStored("cartId");
  if (storedCartId !== null) {
    try {
      return await requestJson<Cart>("POST", `/api/carts/${storedCartId}/items`, item);
    } catch (error) {
      if (!isStoredCartGone(error)) {
        throw error;
      }
      removeStored("cartId");
    }
  }
  const cartId = await createCart();
  return requestJson<Cart>("POST", `/api/carts/${cartId}/items`, item);
}

/** Replaces the quantity of a Cart Item and returns the updated Cart. */
export function updateCartItem(cartId: string, productId: string, quantity: number): Promise<Cart> {
  const body: UpdateCartItemBody = { quantity };
  return requestJson<Cart>("PATCH", `/api/carts/${cartId}/items/${productId}`, body);
}

/** Removes a Cart Item and returns the updated Cart (`empty` after the last one). */
export function removeCartItem(cartId: string, productId: string): Promise<Cart> {
  return requestJson<Cart>("DELETE", `/api/carts/${cartId}/items/${productId}`);
}

/** Applies the Coupon with this code, replacing any other, and returns the Cart with its Discount. */
export function applyCoupon(cartId: string, code: string): Promise<Cart> {
  const body: ApplyCouponBody = { code };
  return requestJson<Cart>("PUT", `/api/carts/${cartId}/coupon`, body);
}

/** Removes the applied Coupon (a no-op when there is none) and returns the Cart. */
export function removeCoupon(cartId: string): Promise<Cart> {
  return requestJson<Cart>("DELETE", `/api/carts/${cartId}/coupon`);
}

/** Starts the checkout: the items lock for review (with_items → checkout). */
export function checkoutCart(cartId: string): Promise<Cart> {
  return requestJson<Cart>("POST", `/api/carts/${cartId}/checkout`);
}

/** Goes back to editing from the checkout, unlocking the items (checkout → with_items). */
export function editCart(cartId: string): Promise<Cart> {
  return requestJson<Cart>("POST", `/api/carts/${cartId}/edit`);
}

/**
 * Confirms the Order (checkout → order_created) and returns it. The Cart is done with, so its
 * id is forgotten and the next addition starts a new Cart.
 */
export async function confirmCart(cartId: string): Promise<Order> {
  let order: Order;
  try {
    order = await requestJson<Order>("POST", `/api/carts/${cartId}/confirm`);
  } catch (error) {
    // Already confirmed elsewhere (another tab) or gone: forget it too.
    if (isStoredCartGone(error)) {
      removeStored("cartId");
    }
    throw error;
  }
  removeStored("cartId");
  return order;
}
