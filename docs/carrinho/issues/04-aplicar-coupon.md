# 04: Aplicar Coupon

**Spec:** [FRD do Carrinho](../frd-carrinho.md)

**What to build:** o Shopper digita o código de um Coupon no Cart e vê o Discount e o Total recalculados pelo servidor. Pode trocar o Coupon por outro ou removê-lo. Códigos inexistentes ou expirados são recusados com mensagens claras. Coupons existem apenas no banco (criados por seed ou pelos testes), sem API de criação.

**Blocked by:** 03 (Alterar e remover Cart Items)

**Status:** resolved

- [x] Migration da tabela de Coupons: código único guardado em maiúsculas, tipo `percentage` ou `fixed`, valor coerente com o tipo (1 a 100 para percentual; centavos maiores que zero para fixo) e instante de expiração com fuso. O Cart passa a referenciar o Coupon aplicado.
- [x] `PUT /api/carts/:id/coupon` com `{ code }` aplica o Coupon e devolve o Cart com `coupon: { code, type, value }`, `discountCents` e `totalCents`; o código é aceito sem diferenciar maiúsculas de minúsculas.
- [x] Código inexistente responde `422 COUPON_NOT_FOUND`; Coupon com `agora >= expiração` (relógio injetado) responde `422 COUPON_EXPIRED`; Cart `empty` responde `409 CART_EMPTY`.
- [x] Aplicar outro Coupon substitui o anterior; `DELETE /api/carts/:id/coupon` remove o Coupon, e remover quando não há Coupon devolve o Cart sem erro.
- [x] Discount percentual é `floor(Subtotal × valor / 100)`; fixo é `min(valor, Subtotal)`; Total nunca negativo. Testes com valores independentes, ex.: Subtotal 9999 com 10% → Discount 999 e Total 9000; fixo de 5000 sobre Subtotal 3000 → Discount 3000 e Total 0.
- [x] Alterar ou remover itens recalcula o Discount; remover o último item também remove o Coupon.
- [x] Aplicar e remover Coupon atualizam o instante da última alteração e não mudam o status.
- [x] Frontend: campo de Coupon com aplicar e remover em `#/carrinho`, mostrando o Coupon aplicado, o Discount e o Total; erros de Coupon com a mensagem em português do código.
- [x] Testes de integração na seam do app HTTP para cada critério de API acima.
- [x] E2E: aplicar um Coupon criado pelo teste e ver Discount e Total; aplicar um código inválido e ver a mensagem de erro. O suporte de banco do E2E passa a inserir Coupons e a limpar a tabela.
