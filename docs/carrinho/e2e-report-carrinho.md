# Relatório E2E do Carrinho

Testes de ponta a ponta do Cart, na seam 2 do [FRD do Carrinho](frd-carrinho.md) (Testing Decisions): Playwright no navegador contra a stack do compose, pelo nginx. Ticket: [09-lacunas-e2e.md](issues/09-lacunas-e2e.md).

## Como rodar

```sh
make test-e2e
```

O comando sobe uma stack nova e isolada, roda o Playwright e remove essa stack no fim, passe ou falhe o teste:

- **Projeto compose próprio** (`-p aigile-ecommerce-e2e`, com [docker-compose.e2e.yml](../../docker-compose.e2e.yml) por cima do [docker-compose.yml](../../docker-compose.yml)): containers, rede e volume do banco são outros. Os testes apagam e recriam Products, Coupons, Carts e Orders sem tocar nos dados de desenvolvimento.
- **Sem portas publicadas** no host (`ports: !reset []` em `db`, `api` e `web`), então roda com `make up` de pé.
- **Antes e depois** de cada execução, `down -v` remove a stack e o volume. Toda execução começa de um banco recém-migrado.
- **O navegador entra pelo nginx** (`http://web:8080`), como o Shopper, e o nginx repassa `/api/*` ao backend.
- **Cada teste insere os próprios dados**: o `beforeEach` troca os Products pelos três do teste e esvazia Carts, Orders e Coupons; os Coupons são inseridos pelo teste que os usa. O suporte de banco ([e2e/support/database.ts](../../e2e/support/database.ts)) também simula mudanças que o sistema não oferece: outra compra levando o Stock (`setStock`), o preço do Product mudando (`setPrice`) e o tempo passando sem alteração no Cart (`backdateCartHolding`, que recua a última alteração do Cart, porque o relógio da stack não é controlável).
- **Cada teste usa um contexto de navegador novo**, ou seja, um Shopper novo sem Cart. Os testes rodam um por vez (`workers: 1`), porque dividem o banco, e sem retries (`retries: 0`).

## Cenários e testes

Todos os testes ficam em [e2e/tests/cart.spec.ts](../../e2e/tests/cart.spec.ts). Os quatro últimos entraram no ticket 09.

| # | Cenário | Teste |
| --- | --- | --- |
| 1 | Adicionar do catálogo, somar uma adição repetida do mesmo Product e manter o Cart ao recarregar | `adding from the catalog shows the Product in the Cart, sums a repeated addition and survives a reload` |
| 2 | Product esgotado não pode ser adicionado | `a sold-out Product cannot be added` |
| 3 | Quantidade acima do Stock exibido é recusada no navegador, sem requisição | `a quantity above the Stock shown is refused before anything is sent` |
| 4 | Falta de Stock encontrada pelo servidor ao adicionar, com a mensagem em português | `a Stock shortage the server finds is shown with its Portuguese message` |
| 5 | Alterar a quantidade atualiza o subtotal do item e o Subtotal | `changing a quantity in the Cart updates the item subtotal and the Subtotal` |
| 6 | Quantidade acima do Stock recusada no Cart | `a quantity above the Stock is refused in the Cart with the Portuguese message` |
| 7 | Remover itens; remover o último mostra o Cart vazio | `removing items keeps the others, and removing the last one shows the empty Cart` |
| 8 | Aplicar Coupon (código em minúsculas) mostra Discount e Total; remover restaura o Total | `applying a Coupon shows the Discount and the Total, and removing it restores the Total` |
| 9 | Coupon inexistente e Coupon expirado recusados com a mensagem em português | `an unknown or expired Coupon code is refused with the Portuguese message` |
| 10 | Checkout trava os itens e deixa o Coupon editável; voltar para editar destrava | `checkout locks the items but keeps the Coupon editable, and going back to editing unlocks them` |
| 11 | Caminho feliz completo até a página do Order, Stock decrementado e Cart novo na próxima adição | `the whole purchase: add, change, apply a Coupon, check out, edit, check out again and confirm the Order` |
| 12 | Confirmar depois que outra compra levou o Stock: diz qual Product falta e o Cart continua em checkout | `confirming after another purchase took the Stock says which Product is short and keeps the Cart in checkout` |
| 13 | Abandono explícito; a próxima adição cria um Cart novo | `abandoning the Cart forgets it, and the next addition starts a new Cart` |
| 14 | **Cart expirado:** com a última alteração recuada 24 h, o Shopper vê "Seu carrinho expirou." e a próxima adição cria um Cart novo, Com itens, só com o Product novo | `a Cart left unchanged for 24 hours shows as expired, and the next addition starts a new Cart` |
| 15 | **Coupon de uso único por Shopper:** depois de um Order com `DEZ`, reaplicá-lo num Cart novo mostra "Você já usou este cupom em outro pedido."; outro Shopper (segundo contexto de navegador) aplica `DEZ` e vê o Discount | `a Shopper cannot use a Coupon again after an Order, while another Shopper still can` |
| 16 | **Navegador limpo é um Shopper novo:** limpar o `localStorage` e recarregar mostra o Cart vazio | `a browser with its storage cleared is a new Shopper with an empty Cart` |
| 17 | **Preço unitário fixo:** depois de mudar o preço do Product no banco, o Cart mantém R$ 39,90 e o catálogo mostra R$ 45,90 | `a Product's new price shows in the catalog but not on the item already in the Cart` |

A suíte E2E tem ainda dois testes do catálogo ([catalog.spec.ts](../../e2e/tests/catalog.spec.ts)) e um do `/health` ([health.spec.ts](../../e2e/tests/health.spec.ts)), que entram no total de cada execução abaixo.

Os testes 14 e 16 foram conferidos contra mutações: recuar 23 h em vez de 24 h e não limpar o `localStorage` fazem os dois falharem. Os testes 14 e 17 falharam antes de o suporte de banco ganhar `backdateCartHolding` e `setPrice`.

## O que fica fora do E2E

Estas regras ficam na seam 1 (integração: app Fastify com `inject()` contra o PostgreSQL real e relógio injetado). No navegador elas não mostram nada a mais, ou dependem de controle que a stack não dá (relógio, simultaneidade exata).

| Regra | Por que só na integração |
| --- | --- |
| Substituir um Coupon por outro | A tela é a mesma de aplicar (teste 8); a regra de haver no máximo um Coupon é do backend e a integração verifica a resposta completa. |
| Discount fixo limitado ao Subtotal (Total 0) | É aritmética do backend. A integração confere os centavos com valores independentes; no navegador seria só mais um texto formatado. |
| Arredondamento do percentual para baixo | Mesmo motivo: o caso de borda (3 × R$ 33,33 com 10%) é conferido em centavos na integração. |
| Abandonar a partir do checkout | A transição `checkout → abandoned` é da tabela de transições, coberta na integração. Na tela o caminho é o do teste 13. |
| Recusas `409` em status finais | Exigem chamadas que a interface não oferece (a tela some depois de um status final). A integração cobre cada código de erro no envelope padrão. |
| Duas abas concorrendo (Stock e Coupon) | Exige requisições simultâneas de verdade; a integração dispara `Promise.all` de dois `inject()` e confere que exatamente uma confirmação vence. |
| Limite das 24 h (23h59 contra 24h, `GET` sem reiniciar a contagem) | O relógio da stack não é controlável. A integração avança o relógio injetado; o E2E cobre só a tela do Cart expirado (teste 14). |

## Execuções

Três execuções seguidas de `make test-e2e` em 18/11/2026, depois dos quatro testes novos, todas verdes, sem retries:

| Execução | Testes | Resultado | Tempo do Playwright | Tempo total do `make test-e2e` |
| --- | --- | --- | --- | --- |
| 1 | 20 (17 do Cart) | 20 passaram | 13,4 s | 36 s |
| 2 | 20 (17 do Cart) | 20 passaram | 14,3 s | 37 s |
| 3 | 20 (17 do Cart) | 20 passaram | 14,7 s | 37 s |

O tempo total inclui subir a stack isolada (imagens já em cache), migrar o banco e removê-la no fim. Nenhuma execução falhou, então não houve causa a corrigir.
