# Money as integer cents

Prices, subtotals, discounts and totals are stored in the database and sent over the API as integer cents in a single currency (BRL), e.g. `priceCents: 1999` for R$ 19,99, and formatted only by the frontend Domain formatter, which Presentation calls. This keeps arithmetic exact; percentage discounts are where decimal rounding would otherwise leak across the codebase. The rounding rule for percentage discounts is decided with the cart feature.
