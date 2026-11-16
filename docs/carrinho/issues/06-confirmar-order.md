# 06: Confirmar o Order

**Spec:** [FRD do Carrinho](../frd-carrinho.md)

**What to build:** no checkout, o Shopper clica em "Confirmar pedido". Numa única transação o Stock é decrementado, o Order é criado no status Criado com uma cópia dos itens, dos valores e do Coupon, e o Cart passa a Pedido Criado. O Shopper vai para a página de confirmação do Order. Se faltar Stock ou o Coupon tiver expirado, nada muda, o Cart continua Em Checkout e o Shopper vê o motivo. Dois Shoppers disputando a última unidade nunca compram os dois (ADR 0009).

**Blocked by:** 05 (Checkout e voltar a editar)

**Status:** ready-for-agent

- [ ] Migrations das tabelas de Orders e Order Items: Shopper id, Cart de origem, status restrito (`created` por ora), Subtotal, Discount e Total em centavos, cópia do Coupon (código, tipo e valor, nulos sem Coupon) e instante de criação; Order Items com Product, quantidade e preço unitário.
- [ ] `POST /api/carts/:id/confirm` só a partir de `checkout` (outros estados: `409 INVALID_CART_TRANSITION`); responde `201` com o Order no formato do FRD.
- [ ] Numa única transação: revalida o Coupon (expirado → `422 COUPON_EXPIRED`), decrementa o Stock item a item em ordem crescente de product id com update condicional, cria Order e Order Items e move o Cart para `order_created`.
- [ ] O Repository informa quais itens não puderam ser decrementados; o Service responde `409 INSUFFICIENT_STOCK` com `details` listando **todos** os Products em falta e desfaz tudo: sem Order, Stock intacto, Cart em `checkout`.
- [ ] O Order guarda a cópia do Coupon: alterar o Coupon depois não muda o Order.
- [ ] `GET /api/orders/:id` devolve o Order; Order inexistente responde `404 ORDER_NOT_FOUND`.
- [ ] Um Cart `order_created` recusa qualquer mutação com `409 INVALID_CART_TRANSITION`.
- [ ] Teste de concorrência: duas confirmações simultâneas de Carts diferentes disputando a última unidade; exatamente uma cria Order, a outra responde `INSUFFICIENT_STOCK` e o Stock termina em 0.
- [ ] Teste de expiração: Coupon aplicado e relógio avançado para depois da expiração antes de confirmar → `COUPON_EXPIRED` sem efeitos.
- [ ] Frontend: botão "Confirmar pedido" no checkout; após o sucesso, o Cart id é descartado e a navegação vai para `#/pedido/:id`, que mostra itens, Subtotal, Discount, Total e Coupon, com link para continuar comprando.
- [ ] Frontend: um Cart guardado que já está `order_created` ou responde `CART_NOT_FOUND` é descartado, e a próxima adição cria um Cart novo.
- [ ] Testes de integração na seam do app HTTP para cada critério de API acima.
- [ ] E2E do caminho feliz completo: adicionar → alterar quantidade → aplicar Coupon → finalizar → voltar para editar → finalizar → confirmar → página de confirmação com os valores certos. E2E do erro de Stock: Stock reduzido por fora antes de confirmar e a mensagem exibida. O suporte de banco do E2E passa a limpar também as tabelas de Orders.
- [ ] README atualizado com as rotas de confirmação e de Order.

## Comments

- O ticket 02 já descarta o Cart id guardado quando a API responde `CART_NOT_FOUND`, e a próxima adição cria um Cart novo (`frontend/src/api/carts.ts`). Aqui falta descartar o Cart guardado que está `order_created`.
