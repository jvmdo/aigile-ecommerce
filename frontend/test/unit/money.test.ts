import { describe, expect, it } from "vitest";
import { formatPrice } from "../../src/domain/money.ts";

describe("formatPrice", () => {
  it("formats integer cents as reais", () => {
    expect(formatPrice(1999)).toBe("R$ 19,99");
  });

  it("formats zero as R$ 0,00", () => {
    expect(formatPrice(0)).toBe("R$ 0,00");
  });

  it("separates thousands with a dot", () => {
    expect(formatPrice(123456)).toBe("R$ 1.234,56");
    expect(formatPrice(123456789)).toBe("R$ 1.234.567,89");
  });

  it("keeps the trailing zero of whole and round amounts", () => {
    expect(formatPrice(5000)).toBe("R$ 50,00");
    expect(formatPrice(1050)).toBe("R$ 10,50");
  });
});
