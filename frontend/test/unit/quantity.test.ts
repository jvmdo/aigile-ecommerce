import { describe, expect, it } from "vitest";
import { validateQuantity } from "../../src/domain/quantity.ts";

const INVALID_QUANTITY = "Informe uma quantidade inteira de 1 a 99.";

describe("validateQuantity", () => {
  it("accepts 1 and 99", () => {
    expect(validateQuantity(1, 200)).toEqual({ valid: true });
    expect(validateQuantity(99, 200)).toEqual({ valid: true });
  });

  it("rejects 0 and 100", () => {
    expect(validateQuantity(0, 200)).toEqual({ valid: false, message: INVALID_QUANTITY });
    expect(validateQuantity(100, 200)).toEqual({ valid: false, message: INVALID_QUANTITY });
  });

  it("rejects a fractional quantity", () => {
    expect(validateQuantity(1.5, 200)).toEqual({ valid: false, message: INVALID_QUANTITY });
  });

  it("rejects an empty field (NaN)", () => {
    expect(validateQuantity(Number.NaN, 200)).toEqual({ valid: false, message: INVALID_QUANTITY });
  });

  it("accepts exactly the Stock shown and rejects one more", () => {
    expect(validateQuantity(3, 3)).toEqual({ valid: true });
    expect(validateQuantity(4, 3)).toEqual({
      valid: false,
      message: "Só há 3 unidades em estoque.",
    });
  });

  it("names a single unit in the singular", () => {
    expect(validateQuantity(2, 1)).toEqual({
      valid: false,
      message: "Só há 1 unidade em estoque.",
    });
  });

  it("checks only the 1 to 99 range when the Stock is not known (the Cart page)", () => {
    expect(validateQuantity(99)).toEqual({ valid: true });
    expect(validateQuantity(0)).toEqual({ valid: false, message: INVALID_QUANTITY });
    expect(validateQuantity(100)).toEqual({ valid: false, message: INVALID_QUANTITY });
  });
});
