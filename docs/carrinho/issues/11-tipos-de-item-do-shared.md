# 11: Tipos de item derivados do `shared`

**Spec:** [FRD do Carrinho](../frd-carrinho.md): Contrato da API

**What to build:** corrigir os achados R3 e R4 da [revisão do carrinho](../review-carrinho.md). Tipos que espelham um contrato devem ser aliases ou `Pick`s dos tipos do `shared` (`CODING_STANDARDS.md`, "Contracts"), não cópias locais com os mesmos campos. Só tipos mudam; nenhum comportamento muda.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `CartItemRecord` ([carts.repository.ts](../../../backend/src/carts/carts.repository.ts)) e `OrderItemRecord` ([orders.repository.ts](../../../backend/src/orders/orders.repository.ts)) são `Pick`s de `CartItem` e `OrderItem` do `shared`.
- [x] `NewOrder.items` usa um `Pick` de `OrderItem` em vez do tipo inline.
- [x] O tipo inline `{ productId; name }` de [error-messages.ts](../../../frontend/src/domain/error-messages.ts) e o literal `"percentage" | "fixed"` de [database.ts](../../../e2e/support/database.ts) passam a usar os tipos do `shared` (`Pick` de `CartItem`, `CouponType`).
- [x] `make check` e `make test` verdes.

## Comments

- O `e2e` passou a declarar `@aigile/shared` como devDependency para importar `CouponType`. O import é só de tipo e é apagado ao rodar o Playwright, então a imagem do E2E não precisa do código do `shared`.
