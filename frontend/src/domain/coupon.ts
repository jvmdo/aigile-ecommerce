import { type AppliedCoupon, MAX_COUPON_CODE_LENGTH } from "@aigile/shared";
import { formatPrice } from "./money.ts";

export type CouponCodeCheck = { valid: true; code: string } | { valid: false; message: string };

/**
 * Checks a typed Coupon code before it is sent, without the spaces around it. Letter case is
 * left alone: the server compares codes ignoring it.
 */
export function validateCouponCode(typed: string): CouponCodeCheck {
  const code = typed.trim();
  if (code === "") {
    return { valid: false, message: "Informe o código do cupom." };
  }
  if (code.length > MAX_COUPON_CODE_LENGTH) {
    return {
      valid: false,
      message: `O código do cupom tem no máximo ${MAX_COUPON_CODE_LENGTH} caracteres.`,
    };
  }
  return { valid: true, code };
}

/** The applied Coupon as the Cart shows it: "DEZ (10% de desconto)" or "MENOS25 (R$ 25,00 de desconto)". */
export function describeCoupon({ code, type, value }: AppliedCoupon): string {
  const amount = type === "percentage" ? `${value}%` : formatPrice(value);
  return `${code} (${amount} de desconto)`;
}
