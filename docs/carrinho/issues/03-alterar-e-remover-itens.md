# 03: Alterar e remover Cart Items

**Spec:** [FRD do Carrinho](../frd-carrinho.md)

**What to build:** no Cart, o Shopper altera a quantidade de um Cart Item e remove itens. A nova quantidade respeita os mesmos limites (1 a 99 e o Stock atual). Remover o último item devolve o Cart ao estado Vazio.

**Blocked by:** 02 (Adicionar ao Cart e ver o Cart)

**Status:** resolved

- [x] `PATCH /api/carts/:id/items/:productId` com `{ quantity }` substitui a quantidade e devolve o Cart; o preço unitário não muda.
- [x] Quantidade fora de 1 a 99 (inclusive zero) responde `400 VALIDATION_ERROR`; acima do Stock responde `409 INSUFFICIENT_STOCK` com `details`.
- [x] `DELETE /api/carts/:id/items/:productId` remove o item e devolve o Cart; remover um item que não é o último mantém `with_items`; remover o último leva a `empty` com Subtotal 0.
- [x] Alterar ou remover um Product que não está no Cart responde `404 CART_ITEM_NOT_FOUND`.
- [x] As duas mutações atualizam o instante da última alteração.
- [x] Frontend: em `#/carrinho`, cada item tem quantidade editável (validada pelo Domain antes de enviar) e botão de remover; a tela é redesenhada a partir do Cart devolvido.
- [x] Testes de integração na seam do app HTTP para cada critério de API acima.
- [x] E2E: alterar a quantidade de um item e ver os valores atualizados; remover um item; remover o último e ver a mensagem de Cart vazio.
