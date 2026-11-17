import { describe, expect, it } from "vitest";
import { allowedCartActions, cartStatusLabel } from "../../src/domain/cart-status.ts";

describe("allowedCartActions", () => {
  it("lets a Cart with items be edited, have its Coupon changed and go to checkout", () => {
    expect(allowedCartActions("with_items")).toEqual(["editItems", "editCoupon", "checkout"]);
  });

  it("locks the items in checkout but keeps the Coupon editable, and allows going back to editing or confirming the Order", () => {
    expect(allowedCartActions("checkout")).toEqual(["editCoupon", "edit", "confirm"]);
  });

  it("allows nothing on an empty Cart or on a final one", () => {
    expect(allowedCartActions("empty")).toEqual([]);
    expect(allowedCartActions("order_created")).toEqual([]);
    expect(allowedCartActions("abandoned")).toEqual([]);
  });
});

describe("cartStatusLabel", () => {
  it("gives the Portuguese label of each status", () => {
    expect(cartStatusLabel("empty")).toBe("Vazio");
    expect(cartStatusLabel("with_items")).toBe("Com itens");
    expect(cartStatusLabel("checkout")).toBe("Em checkout");
    expect(cartStatusLabel("order_created")).toBe("Pedido criado");
    expect(cartStatusLabel("abandoned")).toBe("Abandonado");
  });
});
