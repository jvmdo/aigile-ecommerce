/**
 * The demonstration Shoppers: one per scenario, with a Shopper id and a Cart id that stay the
 * same on every `make seed`, so `docs/seeds-report.md` can tell a person how to become one in
 * the browser. Ids follow the UUID v4 layout the routes accept.
 */
export type DemoShopper = {
  shopperId: string;
  cartId: string;
  /** What the person sees in this Cart, in Portuguese, as the report lists it. */
  scenario: string;
};

function demo(n: number, scenario: string): DemoShopper {
  const suffix = String(n).padStart(12, "0");
  return {
    shopperId: `5eed0000-0000-4000-8000-${suffix}`,
    cartId: `5eedca27-0000-4000-8000-${suffix}`,
    scenario,
  };
}

export const demoShoppers = {
  withItems: demo(1, "Com Itens: Cart Item com quantidade 99 e Cart Item com preço defasado"),
  checkoutExpiredCoupon: demo(2, "Em Checkout com Coupon que expirou depois de aplicado"),
  checkoutShortStock: demo(3, "Em Checkout pedindo mais que o Stock atual"),
  couponAlreadyUsed: demo(4, "Com Itens; o Shopper já usou o Coupon BEMVINDO10 num Order"),
  idle: demo(5, "Parado há 3 dias: vira Abandonado ao ser aberto"),
  fullDiscount: demo(6, "Em Checkout com Coupon de 100% (Total zero)"),
  fixedOverSubtotal: demo(7, "Com Itens e Coupon fixo maior que o Subtotal"),
  empty: demo(8, "Vazio"),
  abandoned: demo(9, "Abandonado explicitamente"),
} satisfies Record<string, DemoShopper>;

/** Codes of the fixed Coupons the demonstration Shoppers rely on. */
export const demoCouponCodes = {
  alreadyUsed: "BEMVINDO10",
  expiredAfterApplied: "FLASH25",
  fullDiscount: "CORTESIA100",
  fixedOverSubtotal: "VALE500",
} as const;
