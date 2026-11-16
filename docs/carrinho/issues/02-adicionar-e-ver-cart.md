# 02: Adicionar ao Cart e ver o Cart (tracer bullet)

**Spec:** [FRD do Carrinho](../frd-carrinho.md)

**What to build:** o Shopper clica em "Adicionar ao carrinho" num Product do catálogo, escolhendo a quantidade, e vê o Product no Cart em `#/carrinho`, com preço unitário, quantidade, subtotal do item e Subtotal do Cart. O Cart é criado na primeira adição e sobrevive a um recarregamento da página. Adicionar de novo o mesmo Product soma a quantidade. Quantidades inválidas, acima do Stock ou de Products inexistentes são recusadas com mensagens claras. Este ticket atravessa banco, contrato, API, Service, frontend e os três níveis de teste.

**Blocked by:** 01 (Prefactor: erros de domínio e relógio injetado)

**Status:** resolved

- [x] Migrations das tabelas de Carts e Cart Items: UUIDs gerados pelo banco, Shopper id, status restrito aos cinco valores, instante da última alteração, quantidade entre 1 e 99, preço unitário maior ou igual a zero e unicidade de (Cart, Product).
- [x] Contratos no shared para o Cart (formato completo do FRD, com `coupon: null`, `discountCents: 0` e `totalCents` igual ao Subtotal) e para os corpos de criação e adição.
- [x] `POST /api/carts` com `{ shopperId }` responde `201` com um Cart `empty`.
- [x] `GET /api/carts/:id` devolve o Cart; Cart inexistente responde `404 CART_NOT_FOUND`.
- [x] `POST /api/carts/:id/items` adiciona o Product: o primeiro item leva o Cart de `empty` a `with_items`; adicionar o mesmo Product soma a quantidade e mantém o preço unitário original.
- [x] O preço unitário é o do Product no momento da adição: mudar o preço do Product depois não altera o Cart Item.
- [x] Quantidade fora de 1 a 99, fracionária ou ids que não são UUID respondem `400 VALIDATION_ERROR` no envelope (cobre o teste de `400` adiado no scaffolding).
- [x] Soma acima de 99 responde `422 QUANTITY_LIMIT_EXCEEDED`; quantidade resultante acima do Stock responde `409 INSUFFICIENT_STOCK` com `details` `[{ productId, requested, available }]`; Product inexistente responde `404 PRODUCT_NOT_FOUND`.
- [x] Toda mutação atualiza o instante da última alteração do Cart pelo relógio injetado; o `GET` não.
- [x] Frontend: o Shopper id é gerado uma vez e guardado no `localStorage`; o Cart id é guardado após a criação; leituras e escritas passam por um único ponto com `try/catch`.
- [x] Frontend: navegação por hash entre `#/` (catálogo) e `#/carrinho`, com um link para o Cart sempre visível.
- [x] Frontend: cada card de Product tem campo de quantidade e "Adicionar ao carrinho", desabilitado quando Esgotado; o Domain valida a quantidade (inteiro de 1 a 99 e até o Stock exibido) antes de enviar.
- [x] Frontend: `#/carrinho` mostra os itens (nome, preço unitário, quantidade, subtotal do item) e o Subtotal formatados em reais, ou a mensagem de Cart vazio com link para o catálogo; erros de domínio aparecem com a mensagem em português do código.
- [x] Testes de unidade do Domain: validação de quantidade (0, 1, 99, 100, fracionário, acima do Stock) e mensagens por código de erro.
- [x] Testes de integração na seam do app HTTP para cada critério de API acima.
- [x] E2E: adicionar do catálogo, ver o Cart com os valores certos, adicionar o mesmo Product de novo (quantidade somada) e recarregar mantendo o Cart. O suporte de banco do E2E passa a limpar também as tabelas do Cart.
- [x] README atualizado com as rotas do Cart.
