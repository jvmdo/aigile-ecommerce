# 12: Um único cálculo do total da linha

**Spec:** [FRD do Carrinho](../frd-carrinho.md): Cálculo do dinheiro (ADR 0005)

**What to build:** corrigir o achado R5 da [revisão do carrinho](../review-carrinho.md). O total de uma linha (quantidade × preço unitário) é calculado em dois Services, o do Cart e o do Order. Passa a ser uma função só, usada pelos dois, para que a regra do dinheiro não divirja.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Uma função de domínio no backend calcula `lineTotalCents`; [carts.service.ts](../../../backend/src/carts/carts.service.ts) e [orders.service.ts](../../../backend/src/orders/orders.service.ts) a usam.
- [x] Nenhum comportamento muda: `make test` verde sem alterar testes.
