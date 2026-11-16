# Money as integer cents

Prices, subtotals, discounts and totals are stored in the database and sent over the API as integer cents in a single currency (BRL), e.g. `priceCents: 1999` for R$ 19,99, and formatted only by the frontend Domain formatter, which Presentation calls. This keeps arithmetic exact; percentage discounts are where decimal rounding would otherwise leak across the codebase. The rounding rule for percentage discounts is decided with the cart feature.

**Rounding rule (decided with the cart feature):** a percentage discount is `floor(subtotalCents × percent / 100)`, i.e. rounded down to the cent in the store's favour, which also guarantees it never exceeds the subtotal. A fixed discount is `min(valueCents, subtotalCents)`, so the total is never negative.
