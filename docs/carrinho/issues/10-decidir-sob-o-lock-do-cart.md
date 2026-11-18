# 10: Alterações de itens decididas sob o lock do Cart

**Spec:** [FRD do Carrinho](../frd-carrinho.md): Máquina de estados do Cart; Cart Items; Testing Decisions

**What to build:** corrigir os achados R1 e R2 da [revisão do carrinho](../review-carrinho.md). Adicionar, alterar e remover um Cart Item hoje decidem as regras (último item, limite de 99, Estoque) com base numa leitura feita **antes** do lock do Cart; a escrita condicional só confere o status. Duas requisições concorrentes sobre o mesmo Cart podem, assim, deixar um Cart `with_items` sem itens e com o Coupon aplicado (R1), ou somar quantidades acima do Estoque e do limite (R2). A correção: cada uma dessas operações trava o Cart, relê o Cart sob o lock e só então decide e escreve, numa única transação via `InTransaction` (ADR 0010), como a confirmação já faz.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] O Repository do Cart ganha uma leitura que trava a linha do Cart até o fim da transação; adicionar, alterar e remover um Cart Item leem o Cart por ela, dentro de `InTransaction`, e decidem as regras sobre essa leitura.
- [ ] Duas remoções concorrentes dos dois Cart Items de um Cart com Coupon terminam com o Cart `empty`, sem itens e sem Coupon.
- [ ] Duas adições concorrentes do mesmo Product cuja soma passa do Estoque: uma responde `200`, a outra `409 INSUFFICIENT_STOCK`, e a quantidade final não passa do Estoque.
- [ ] Duas adições concorrentes do mesmo Product cuja soma passa de 99: uma responde `200`, a outra `422 QUANTITY_LIMIT_EXCEEDED`, e a quantidade final não passa de 99.
- [ ] Testes de integração na seam do app HTTP para os três cenários de corrida acima; os testes existentes continuam verdes.
