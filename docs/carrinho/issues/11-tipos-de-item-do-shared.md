# 11: Tipos de item derivados do `shared`

**Spec:** [FRD do Carrinho](../frd-carrinho.md): Contrato da API

**What to build:** corrigir os achados R3 e R4 da [revisão do carrinho](../review-carrinho.md). Tipos que espelham um contrato devem ser aliases ou `Pick`s dos tipos do `shared` (`CODING_STANDARDS.md`, "Contracts"), não cópias locais com os mesmos campos. Só tipos mudam; nenhum comportamento muda.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `CartItemRecord` ([carts.repository.ts](../../../backend/src/carts/carts.repository.ts)) e `OrderItemRecord` ([orders.repository.ts](../../../backend/src/orders/orders.repository.ts)) são `Pick`s de `CartItem` e `OrderItem` do `shared`.
- [ ] `NewOrder.items` usa um `Pick` de `OrderItem` em vez do tipo inline.
- [ ] O tipo inline `{ productId; name }` de [error-messages.ts](../../../frontend/src/domain/error-messages.ts) e o literal `"percentage" | "fixed"` de [database.ts](../../../e2e/support/database.ts) passam a usar os tipos do `shared` (`Pick` de `CartItem`, `CouponType`).
- [ ] `make check` e `make test` verdes.
