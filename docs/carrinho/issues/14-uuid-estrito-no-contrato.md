# 14: UUID estrito no contrato

**Spec:** [FRD do Carrinho](../frd-carrinho.md): Contrato da API; Erros de domínio; [relatório de segurança](../security-report-carrinho.md): S4

**What to build:** corrigir S4 do [relatório de segurança](../security-report-carrinho.md). O `format: "uuid"` dos schemas do `shared` aceita a forma `urn:uuid:<uuid>`, que o PostgreSQL rejeita: rotas com esse id respondem `500` e o log registra o SQL com os parâmetros. Os ids do contrato passam a exigir exatamente a forma `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`, de modo que essa entrada é recusada pelo schema da rota com `400 VALIDATION_ERROR`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Um único schema de UUID no `shared`, com o padrão hexadecimal 8-4-4-4-12, usado por todos os ids do contrato (Cart, Cart Item, Shopper, Product, Order).
- [ ] Teste de integração: `urn:uuid:` no id do Cart, no id do Product do caminho, no `shopperId` do corpo e no id do Order → `400 VALIDATION_ERROR`.
- [ ] Os testes existentes continuam verdes.
