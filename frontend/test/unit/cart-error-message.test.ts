import { describe, expect, it } from "vitest";
import { cartErrorMessage } from "../../src/domain/error-messages.ts";

const VASE = "0b6d1f4e-1c2a-4e3b-9d5f-2a7c8e9b0d1a";
const LAMP = "9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b";
const items = [
  { productId: VASE, name: "Vaso de Barro" },
  { productId: LAMP, name: "Luminária de Mesa" },
];

describe("cartErrorMessage", () => {
  it("names the one short Product and how many are left", () => {
    expect(
      cartErrorMessage(
        "INSUFFICIENT_STOCK",
        [{ productId: VASE, requested: 3, available: 2 }],
        items,
      ),
    ).toBe("Não há estoque suficiente de: Vaso de Barro (restam 2).");
  });

  it("names every short Product, saying which are sold out", () => {
    expect(
      cartErrorMessage(
        "INSUFFICIENT_STOCK",
        [
          { productId: VASE, requested: 3, available: 1 },
          { productId: LAMP, requested: 1, available: 0 },
        ],
        items,
      ),
    ).toBe("Não há estoque suficiente de: Vaso de Barro (resta 1), Luminária de Mesa (esgotado).");
  });

  it("gives the message of any other code as errorMessage does", () => {
    expect(cartErrorMessage("COUPON_EXPIRED", undefined, items)).toBe("Este cupom expirou.");
  });

  it("falls back to the general Stock message when no short Product is known", () => {
    expect(cartErrorMessage("INSUFFICIENT_STOCK", undefined, items)).toBe(
      "Não há estoque suficiente para essa quantidade.",
    );
    expect(
      cartErrorMessage(
        "INSUFFICIENT_STOCK",
        [{ productId: "unknown", requested: 1, available: 0 }],
        items,
      ),
    ).toBe("Não há estoque suficiente para essa quantidade.");
  });
});
