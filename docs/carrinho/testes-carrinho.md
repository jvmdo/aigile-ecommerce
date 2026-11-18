# Testes do Carrinho

Relatório do Passo 6 do curso: quais testes cobrem a funcionalidade do Carrinho, em que camada, e o que fica de fora.

## Como os testes foram escritos

O roteiro do curso põe os testes num passo próprio, depois da codificação. Aqui eles foram escritos **durante** a codificação, por TDD (skill `/tdd`), dentro de cada ticket do [blueprint](blueprint-carrinho.md). Cada ticket só fechava com os testes da sua parte verdes. Por isso este passo não acrescenta testes novos: ele inventaria os que existem, confere-os contra as seams do [FRD](frd-carrinho.md) e registra as lacunas.

As seams e as regras do que é um bom teste estão no FRD, em "Testing Decisions", e em `CODING_STANDARDS.md`, em "Tests":

- só se testa nas três seams acordadas;
- o comportamento é observado pela interface pública;
- os valores esperados vêm de literais ou da spec, nunca recalculados como o código calcula;
- nenhum colaborador interno é mockado, e o banco é um PostgreSQL real.

## Como rodar

| Comando | O que roda | Onde |
| --- | --- | --- |
| `make test` | A suíte inteira: unidade, integração e E2E, nessa ordem; para no primeiro nível que falhar | Containers |
| `make test-unit` | Unidade (Domain do frontend) | Container |
| `make test-integration` | Integração (backend contra o database `ecommerce_test`) | Containers |
| `make test-e2e` | E2E (Playwright contra uma stack compose isolada, via nginx) | Containers |
| `make test-unit-host`, `make test-integration-host` | Os mesmos testes no host, para o ciclo rápido de TDD (`FILE=` e `ARGS=` filtram) | Host |

## A pirâmide

Execução de `make test` em 18/11/2026, no commit `8646456`, depois das correções da [revisão](review-carrinho.md):

| Camada | Seam do FRD | Arquivos | Testes | Resultado |
| --- | --- | --- | --- | --- |
| Unidade | 3. Domain do frontend | 7 | 31 | verde |
| Integração | 1. App HTTP do backend | 7 | 130 | verde |
| E2E | 2. Navegador contra a stack | 3 | 20 | verde (15,3 s) |
| **Total** | | **17** | **181** | **verde, 62,6 s de ponta a ponta** |

Nem todos os testes são do Carrinho. Os 181 incluem o catálogo, o `/health`, o envelope de erro e o seed. Os do Carrinho estão detalhados abaixo.

A pirâmide é mais larga no meio do que na base, de propósito. O FRD não abre seam para o Service, a máquina de estados ou o cálculo do Discount do backend: a seam de integração os alcança pela API, e testá-los isolados acoplaria os testes à estrutura interna. A base de unidade fica só com o Domain do frontend, que é feito de funções puras.

## Unidade: Domain do frontend

[frontend/test/unit/](../../frontend/test/unit/), Vitest. Funções puras, sem DOM e sem `fetch`.

| Arquivo | Testes | Cobre |
| --- | --- | --- |
| `quantity.test.ts` | 7 | Validação da quantidade digitada: 0, 1, 99, 100, fracionário, acima do Stock exibido |
| `cart-status.test.ts` | 4 | Ações permitidas por status do Cart e rótulos em português |
| `coupon.test.ts` | 5 | Validação do código antes de enviar (espaços, vazio, 64 caracteres) e descrição do Coupon aplicado (percentual ou valor em reais) |
| `cart-error-message.test.ts` | 4 | A mensagem de `INSUFFICIENT_STOCK` nomeia cada Product em falta com o que resta dele |
| `error-messages.test.ts` | 3 | Uma mensagem em português por código de erro de domínio, e a genérica para os desconhecidos |
| `money.test.ts` | 4 | Centavos para "R$ 19,99" (ADR 0005); do scaffolding, usado pelo Cart |
| `stock.test.ts` | 4 | Rótulo "Esgotado" e Stock exibido; do scaffolding, usado pelo Cart |

## Integração: App HTTP do backend

[backend/test/integration/](../../backend/test/integration/), Vitest. O app é montado com `buildApp` e chamado por `inject()` do Fastify, contra o PostgreSQL real no database `ecommerce_test`, que é limpo antes de cada teste. Um relógio injetado controla a expiração dos Coupons e o abandono por 24 horas.

### `carts.test.ts`: 86 testes

| Bloco | Testes | Regras cobertas |
| --- | --- | --- |
| `POST /api/carts` | 2 | Cart nasce `empty`; Shopper id que não é UUID → `400` |
| `GET /api/carts/:id` | 3 | Formato completo da resposta; Cart inexistente → `404`; id inválido → `400` |
| `POST /api/carts/:id/items` | 16 | `empty` → `with_items`; ordem de entrada; soma com o mesmo Product mantendo o preço unitário original; limites 1 e 99, inclusive a soma acima de 99 (`422 QUANTITY_LIMIT_EXCEEDED`); Stock excedido (`409 INSUFFICIENT_STOCK`); Product inexistente; validação do corpo |
| `PATCH /api/carts/:id/items/:productId` | 9 | Substituir a quantidade mantendo o preço unitário; 99 e exatamente o Stock aceitos; acima do Stock → `409 INSUFFICIENT_STOCK`; Product fora do Cart → `404 CART_ITEM_NOT_FOUND`; Cart inexistente → `404`; corpo e ids inválidos → `400` |
| `DELETE /api/carts/:id/items/:productId` | 4 | Remover um item que não é o último mantém o Cart `with_items`; remover o último leva a `empty` com Subtotal 0; Product fora do Cart e Cart inexistente → `404` |
| `PUT /api/carts/:id/coupon` | 11 | Percentual com arredondamento para baixo; fixo limitado ao Subtotal; 100 %; substituir um Coupon por outro; código em qualquer caixa; inexistente → `422 COUPON_NOT_FOUND`, mantendo o Coupon aplicado; expirado no instante exato (e aceito um milissegundo antes) → `422` |
| `DELETE /api/carts/:id/coupon` | 3 | Remover restaura o Total; remover sem Coupon não tem efeito |
| `POST /api/carts/:id/checkout` e `/edit` | 8 | `with_items` ↔ `checkout`; transições recusadas com `409 INVALID_CART_TRANSITION` |
| Cart in checkout | 4 | Itens travados; Coupon editável no checkout; corrida entre adicionar e iniciar o checkout |
| Ações fora da tabela num Cart `empty` | 1 | Amostra das transições proibidas |
| Discount after item changes | 2 | O Discount é recalculado quando os itens mudam; remover o último item também retira o Coupon |
| `POST /api/carts/:id/abandon` e Cart abandonado | 5 | `with_items` e `checkout` → `abandoned`; `empty` nunca; toda mutação num Cart abandonado → `409` |
| Abandono após 24 horas sem alteração | 7 | 23h59 continua aberto, 24h é abandonado; um `GET` não reinicia a contagem, uma mutação reinicia; `empty` nunca |
| Última alteração do Cart | 8 | Cada mutação grava o instante do relógio; leituras e recusas não gravam |
| Alterações concorrentes no mesmo Cart | 3 | Duas remoções simultâneas esvaziam o Cart e retiram o Coupon; duas adições cuja soma passa do Stock ou de 99: uma passa, a outra é recusada (ticket 10, achados R1 e R2 da revisão) |

### `orders.test.ts`: 17 testes

| Bloco | Testes | Regras cobertas |
| --- | --- | --- |
| `POST /api/carts/:id/confirm` | 10 | Order com cópias dos itens, do dinheiro e do Coupon; Stock decrementado e Cart `order_created`; confirmação fora do checkout → `409`; falta de Stock lista **todos** os Products e não muda nada; confirmar depois que o Stock volta; Coupon expirado entre aplicar e confirmar → `422`, sem mudar nada; a cópia do Coupon no Order não muda quando o Coupon muda; **duas confirmações simultâneas disputando a última unidade: exatamente uma cria Order** |
| `GET /api/orders/:id` | 2 | Order inexistente → `404`; id inválido → `400` |
| Coupon de uso único por Shopper | 4 | Reaplicar depois de um Order → `409 COUPON_ALREADY_USED`; segundo Cart confirmando com o Coupon já usado; **duas confirmações simultâneas do mesmo Shopper com o mesmo Coupon: exatamente uma cria Order**; outro Shopper pode usar o mesmo Coupon |
| Cart com Order criado | 1 | Toda mutação num Cart `order_created` → `409` |

### Apoio

| Arquivo | Testes | Cobre |
| --- | --- | --- |
| `domain-errors.test.ts` | 4 | Erro de domínio → status e envelope `{ error: { code, message, details? } }`; código sem status → `500` sem vazar a mensagem |
| `seed.test.ts` | 13 | O seed gera Carts em cada status e Orders coerentes passando pelo próprio `CartsService` ([relatório de seeds](../seeds-report.md)) |
| `products.test.ts`, `health.test.ts`, `errors.test.ts` | 10 | Catálogo, `/health` e erros genéricos, do scaffolding |

## E2E: navegador contra a stack

[e2e/tests/cart.spec.ts](../../e2e/tests/cart.spec.ts), Playwright: 17 testes do Carrinho, mais 3 do catálogo e do `/health`. Cada teste usa um contexto de navegador novo (um Shopper novo) e insere os próprios dados. O mapa cenário → teste, como a stack E2E é isolada e as 3 execuções seguidas estão no [relatório E2E](e2e-report-carrinho.md); não se repetem aqui.

Em resumo, o E2E cobre:

- a compra inteira: adicionar, alterar, aplicar Coupon, checkout, voltar a editar, confirmar e ver a página do Order;
- o Cart sobrevive a recarregar a página;
- Product esgotado e quantidade acima do Stock, recusados na tela;
- falta de Stock na confirmação, com a mensagem em português;
- Coupon inválido e Coupon de uso único;
- abandono explícito e Cart expirado;
- navegador limpo é um Shopper novo;
- o preço unitário continua fixo quando o preço do Product muda.

## Cobertura das seams do FRD

Conferi cada item da lista de "Seams acordadas" do FRD contra os testes acima. Todos têm ao menos um teste na seam prevista. Os três testes de concorrência do ticket 10 vão além do que o FRD pedia: ele previa só as duas corridas da confirmação.

## Lacunas

| Lacuna | Por que fica assim |
| --- | --- |
| O teste das duas remoções concorrentes (achado R1) passou mesmo antes da correção, em 10 execuções seguidas: nesta máquina as duas leituras não chegaram a se intercalar. Ele trava o comportamento correto, mas não prova sozinho que a corrida foi fechada. | Forçar o entrelaçamento exigiria um gancho de teste dentro do Service, contra a regra de não testar detalhes internos. A correção usa o mesmo lock que fez os dois testes de adição concorrente passarem de vermelho para verde. |
| Corridas que não envolvem dois itens também não têm teste: aplicar um Coupon enquanto o último item é removido, ou alterar a quantidade enquanto o item é removido. | O guard pelo status e, desde o ticket 10, o lock do Cart cobrem esses casos pelo mesmo mecanismo testado acima. Um teste a mais por combinação custaria tempo de suíte sem testar mecanismo novo. |
| O limite exato das 24 horas não é testado no E2E. | O relógio da stack E2E não é controlável. A seam de integração cobre o limite com o relógio injetado, e o E2E cobre a tela do Cart expirado recuando a última alteração no banco. |
| O Service, a máquina de estados e o cálculo do Discount do backend não têm testes de unidade. | Decisão do FRD: a seam de integração os alcança pela API, e testes isolados acoplariam a suíte à estrutura interna. |
| Os Web Components do frontend não têm testes de unidade. | Decisão do FRD: o E2E os cobre. |
| O ciclo de vida do Order depois de Criado (Confirmado, Enviado, Entregue, Cancelado) não tem testes. | Fora do escopo do FRD: não foi implementado. |
