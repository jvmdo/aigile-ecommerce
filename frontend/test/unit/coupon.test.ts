import { describe, expect, it } from "vitest";
import { describeCoupon, validateCouponCode } from "../../src/domain/coupon.ts";

describe("validateCouponCode", () => {
  it("accepts a code and trims the spaces around it", () => {
    expect(validateCouponCode("  dez ")).toEqual({ valid: true, code: "dez" });
  });

  it("rejects an empty or blank code", () => {
    const message = "Informe o código do cupom.";
    expect(validateCouponCode("")).toEqual({ valid: false, message });
    expect(validateCouponCode("   ")).toEqual({ valid: false, message });
  });

  it("accepts 64 characters and rejects 65", () => {
    expect(validateCouponCode("A".repeat(64))).toEqual({ valid: true, code: "A".repeat(64) });
    expect(validateCouponCode("A".repeat(65))).toEqual({
      valid: false,
      message: "O código do cupom tem no máximo 64 caracteres.",
    });
  });
});

describe("describeCoupon", () => {
  it("shows a percentage Coupon with its percentage", () => {
    expect(describeCoupon({ code: "DEZ", type: "percentage", value: 10 })).toBe(
      "DEZ (10% de desconto)",
    );
  });

  it("shows a fixed Coupon with its amount in reais", () => {
    expect(describeCoupon({ code: "MENOS25", type: "fixed", value: 2550 })).toBe(
      "MENOS25 (R$ 25,50 de desconto)",
    );
  });
});
