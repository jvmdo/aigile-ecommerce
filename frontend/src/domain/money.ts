const reais = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a price in integer cents (ADR 0005) as "R$ 19,99". */
export function formatPrice(priceCents: number): string {
  return `R$ ${reais.format(priceCents / 100)}`;
}
