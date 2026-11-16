import { describe, expect, it } from "vitest";
import { formatStock, isSoldOut } from "../../src/domain/stock.ts";

describe("isSoldOut", () => {
  it("is sold out when Stock is zero", () => {
    expect(isSoldOut({ stock: 0 })).toBe(true);
  });

  it("is not sold out while Stock is positive", () => {
    expect(isSoldOut({ stock: 1 })).toBe(false);
    expect(isSoldOut({ stock: 42 })).toBe(false);
  });
});

describe("formatStock", () => {
  it("labels the units of Stock available", () => {
    expect(formatStock(0)).toBe("Estoque: 0");
    expect(formatStock(12)).toBe("Estoque: 12");
  });
});
