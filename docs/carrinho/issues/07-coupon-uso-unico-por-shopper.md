# 07: Coupon de uso único por Shopper

**Spec:** [FRD do Carrinho](../frd-carrinho.md): Regras do Coupon; Confirmação (ADR 0009); Banco de dados; Erros de domínio; Testing Decisions

**What to build:** cada Shopper usa um mesmo Coupon em no máximo um Order. Ao tentar aplicar um Coupon que já usou, o Shopper vê que ele já foi usado. Mesmo que dois Carts do mesmo Shopper tentem confirmar com o mesmo Coupon ao mesmo tempo, só um Order é criado. Outro Shopper continua podendo usar o mesmo Coupon.

**Blocked by:** 06 (Confirmar o Order)

**Status:** resolved

- [x] Ao aplicar, se o Shopper do Cart já tem um Order com esse Coupon, a resposta é `409 COUPON_ALREADY_USED`.
- [x] Migration de um índice único parcial na tabela de Orders sobre (Shopper id, código do Coupon), onde o código não é nulo.
- [x] Na confirmação, a violação desse índice é traduzida em `409 COUPON_ALREADY_USED` e toda a transação é desfeita: sem Order, Stock intacto, Cart em `checkout`.
- [x] Um Shopper diferente aplica e confirma com o mesmo Coupon normalmente.
- [x] Teste de concorrência: dois Carts do mesmo Shopper, ambos em `checkout` com o mesmo Coupon, confirmando simultaneamente; exatamente um cria Order e o Stock é decrementado só uma vez.
- [x] Teste do caso sequencial: o Coupon é aplicado em dois Carts do mesmo Shopper antes de qualquer Order; o primeiro confirma, o segundo recebe `COUPON_ALREADY_USED` na confirmação.
- [x] Frontend: a mensagem em português de `COUPON_ALREADY_USED` aparece ao aplicar e ao confirmar.
- [x] Testes de integração na seam do app HTTP para cada critério de API acima.
