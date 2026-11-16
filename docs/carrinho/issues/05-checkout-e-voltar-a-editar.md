# 05: Checkout e voltar a editar

**Spec:** [FRD do Carrinho](../frd-carrinho.md)

**What to build:** o Shopper clica em "Finalizar compra" e o Cart entra Em Checkout: os itens ficam travados para revisão, mas o Coupon ainda pode ser aplicado ou removido. Ele pode clicar em "Voltar para editar" para destravar os itens. A tabela de transições do diagrama do curso passa a ser centralizada no Service, que é a base das transições restantes (confirmar e abandonar).

**Blocked by:** 04 (Aplicar Coupon)

**Status:** ready-for-agent

- [ ] O Service tem uma única tabela de transições (estado × ação → novo estado) usada por todas as operações do Cart, inclusive as dos tickets anteriores.
- [ ] `POST /api/carts/:id/checkout` leva `with_items` a `checkout`; com o Cart `empty` responde `409 CART_EMPTY`.
- [ ] `POST /api/carts/:id/edit` leva `checkout` a `with_items`.
- [ ] Em `checkout`, adicionar, alterar e remover itens respondem `409 INVALID_CART_TRANSITION` com `details: { status }`; aplicar e remover Coupon continuam permitidos.
- [ ] Ações fora da tabela respondem `409 INVALID_CART_TRANSITION` (ex.: `edit` num Cart `with_items`, `checkout` num Cart já em `checkout`).
- [ ] As duas transições atualizam o instante da última alteração.
- [ ] Frontend Domain: funções puras de ações permitidas por status e de rótulo em português de cada status, com testes de unidade.
- [ ] Frontend: em `with_items`, botão "Finalizar compra"; em `checkout`, itens somente leitura, Coupon editável e botão "Voltar para editar"; o status aparece com o rótulo em português.
- [ ] Testes de integração na seam do app HTTP para cada critério de API acima.
- [ ] E2E: finalizar compra, ver os itens travados, aplicar um Coupon no checkout, voltar para editar e alterar uma quantidade.
