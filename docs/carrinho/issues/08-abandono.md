# 08: Abandono do Cart

**Spec:** [FRD do Carrinho](../frd-carrinho.md): Identidade do Shopper; Máquina de estados do Cart; Abandono por tempo; Frontend; Testing Decisions

**What to build:** o Shopper pode abandonar o Cart explicitamente. Um Cart Com Itens ou Em Checkout sem nenhuma alteração por 24 horas passa a Abandonado na próxima vez que for acessado, sem job agendado. Quando o Shopper volta a um Cart abandonado, vê que ele expirou e começa um Cart novo na próxima adição. Um Cart Vazio nunca é abandonado.

**Blocked by:** 05 (Checkout e voltar a editar)

**Status:** resolved

- [x] `POST /api/carts/:id/abandon` leva `with_items` ou `checkout` a `abandoned`; num Cart `empty` ou final responde `409 INVALID_CART_TRANSITION`.
- [x] Em toda requisição sobre um Cart `with_items` ou `checkout` cuja última alteração tem 24 horas ou mais (relógio injetado), o Service primeiro persiste `abandoned`: o `GET` devolve `200` com o Cart `abandoned`, e qualquer mutação responde `409 INVALID_CART_TRANSITION`.
- [x] Com 23h59 de inatividade o Cart continua aberto; com exatamente 24h é abandonado.
- [x] Um `GET` não reinicia a contagem; uma mutação reinicia.
- [x] Um Cart `empty` nunca é abandonado, nem por tempo nem explicitamente.
- [x] Um Cart `abandoned` recusa qualquer mutação com `409 INVALID_CART_TRANSITION`.
- [x] Frontend: botão "Abandonar carrinho" em `with_items`; ao encontrar o Cart guardado `abandoned`, o Cart id é descartado e aparece "Seu carrinho expirou"; a próxima adição cria um Cart novo para o mesmo Shopper.
- [x] Testes de integração na seam do app HTTP para cada critério de API acima, controlando o relógio.
- [x] E2E: abandonar explicitamente e, em seguida, adicionar um Product criando um Cart novo. O abandono por 24 horas não é testado no E2E (relógio não controlável na stack).
