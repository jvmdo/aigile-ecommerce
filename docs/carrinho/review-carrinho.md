# Revisão de código do Carrinho

## Escopo

- **Intervalo:** `70f3185...HEAD` (de `70f3185`, commit do blueprint do Cart, até `9905b30`).
- **Commits revisados:** `2f57ae7` (ticket 01), `219f256` (02), `e6b8e03` (03), `fe96f0d` (04), `4daed62` (05), `b0ec203` (06), `4ab2672` (07), `70a6923` (08), `9cdf99c` (seeds), `e3f93c2` (09), mais os commits `chore`/`docs` intermediários (`260d1c2`, `764e912`, `ccfe05d`, `866eb5d`, `aeccafc`, `9905b30`).
- **Tamanho:** 102 arquivos, +9221/−176 linhas, em backend, frontend, shared, e2e e docs.

## Método

Usei o skill `code-review` (mattpocock-skills), com dois eixos independentes, cada um revisado por um sub-agente separado e com contexto limpo:

- **Standards:** o diff contra `CODING_STANDARDS.md`, as ADRs `docs/adr/0001`–`0010` e `GLOSSARY.md`, mais a base de *code smells* de Fowler. Os smells são sempre julgamento, e uma regra documentada no repositório prevalece sobre eles.
- **Spec:** o diff contra `docs/carrinho/frd-carrinho.md`, `docs/carrinho/blueprint-carrinho.md` e os tickets `docs/carrinho/issues/01`–`09`. Divergências aceitas e registradas em `## Comments` não contam como achado.

Conferi cada achado dos sub-agentes no código em `HEAD` antes de registrá-lo. Descartei os que não se confirmaram ou eram apenas especulação.

Não reporto aqui os avisos do `npm audit` sobre drizzle-orm e vitest: foram adiados de propósito. Nenhum código foi alterado nesta revisão.

## Achados

| ID | Severidade | Eixo | Arquivo:linha | Descrição | Correção sugerida |
| --- | --- | --- | --- | --- | --- |
| R1 | alto | Standards + Spec | `backend/src/carts/carts.service.ts:113-124`; `backend/src/carts/carts.repository.ts:185-201` | **Corrida ao remover.** `removeItem` escolhe entre `removeLastItem` e `removeItem` pelo `cart.items.length` lido antes do lock. A escrita condicional (`recordChange`) só confere `status = from`.<br><br>Cenário: Cart com 2 Cart Items, dois `DELETE` concorrentes de Products diferentes. Os dois leem 2 itens, os dois gravam `with_items` → `with_items` e passam pelo guard. O Cart termina `with_items`, sem itens e ainda com o Coupon.<br><br>Fere:<br>• `CODING_STANDARDS.md:12`: "A conditional write is guarded by every stored value the Service based its decision on".<br>• FRD: "Remover o último item leva o Cart a `empty` e também remove o Coupon aplicado".<br><br>Esse Cart ainda passa no `checkout`. No `confirm`, `orders.repository.ts:78` faria `insert(...).values([])`. Pela leitura do código isso deve virar erro 500; não executei esse caminho. | Decidir `empty` ou `with_items` dentro da transação, depois do lock. Por exemplo: remover o item, contar os itens que restam e só então definir o status e o `couponId`. Outra opção é guardar a escrita pela contagem de itens lida. Incluir um teste de integração com duas remoções concorrentes. |
| R2 | médio | Standards + Spec | `backend/src/carts/carts.service.ts:70-91`; `backend/src/carts/carts.repository.ts:136-149` | **Corrida ao adicionar.** O limite de 99 e o Stock são verificados contra a quantidade lida antes do lock. A soma acontece no SQL (`quantity + excluded.quantity`), e o guard só confere o status.<br><br>Dois `POST` concorrentes do mesmo Product podem:<br>• passar do Stock sem `INSUFFICIENT_STOCK`;<br>• passar de 99 e esbarrar no CHECK `cart_items_quantity_range`, o que vira 500 em vez de `422 QUANTITY_LIMIT_EXCEEDED`.<br><br>Fere `CODING_STANDARDS.md:12` e o FRD: "Se a soma com um item existente passar de 99, o Service rejeita com `QUANTITY_LIMIT_EXCEEDED`".<br><br>A confirmação ainda protege o Stock real (ADR 0009), por isso a severidade é menor que a de R1. | Validar a quantidade resultante dentro da transação, depois do lock, ou guardar o `upsert` pela quantidade lida (`WHERE quantity = :lida`). Tratar uma violação do CHECK como `QUANTITY_LIMIT_EXCEEDED`. |
| R3 | médio | Standards | `backend/src/carts/carts.repository.ts:26-31`; `backend/src/orders/orders.repository.ts:19-24`; `backend/src/orders/orders.repository.ts:30` | **Cópias locais de tipos do contrato.** `CartItemRecord` e `OrderItemRecord` repetem os campos de `CartItem`/`OrderItem` de `shared`, e `NewOrder.items` é um tipo inline com os mesmos campos.<br><br>Fere `CODING_STANDARDS.md:25`: "Types that mirror a contract shape (… Cart or Order items …) are aliases or `Pick`s of the `shared` types". | Trocar por `Omit<CartItem, "lineTotalCents">` ou `Pick<CartItem, "productId" \| "quantity" \| "unitPriceCents">`. |
| R4 | baixo | Standards | `frontend/src/domain/error-messages.ts:43`; `e2e/support/database.ts:70` | **Mesma regra de R3, em tipos menores:**<br>• `items: readonly { productId: string; name: string }[]` copia campos de `CartItem`;<br>• `type: "percentage" \| "fixed"` copia `CouponType`, que o seed já importa de `shared`. | Usar `Pick<CartItem, "productId" \| "name">` e `CouponType`. |
| R5 | baixo | Standards (smell: Duplicated Code) | `backend/src/carts/carts.service.ts:314`; `backend/src/orders/orders.service.ts:23` | O cálculo `lineTotalCents = quantity * unitPriceCents` aparece em dois Services. | Extrair uma função de cálculo de linha compartilhada (no Service ou em `shared`). |
| R6 | baixo | Standards (smell: Duplicated Code) | `backend/scripts/seed/seed-database.ts:122-130`; `backend/src/app.ts:55-63` | O seed monta o `CartsService` repetindo a composição de `buildApp`. Uma dependência nova exige editar os dois lugares. | Extrair uma fábrica única do `CartsService`, que receba `db` e `clock`, e usá-la nos dois pontos. |
| R7 | baixo | Standards (smell: Duplicated Code) | `e2e/support/database.ts:22, 33, 50, 77, 91` | Cada helper repete `new pg.Client` / `connect` / `try` / `finally` / `end`. | Criar um helper `withClient(fn)`. |
| R8 | baixo | Standards (smell: Mysterious Name) | `backend/scripts/seed/journeys.ts:10`; `backend/src/carts/cart-transitions.ts:5` | O seed exporta um `CartAction` (os passos de uma jornada) com o mesmo nome do `CartAction` da máquina de estados, que é outro tipo. | Renomear o do seed, por exemplo para `SeedCartStep`. |
| R9 | baixo | Standards (smell: Divergent Change) | `frontend/src/presentation/quantity-input.ts:21` | `apiErrorMessage` é um helper genérico de erro de API, mas fica no módulo do campo de quantidade. `cart-page.ts` e `product-card.ts` o importam de lá. | Mover para um módulo de apresentação de erros, ou para junto de `domain/error-messages.ts`. |
| R10 | baixo | Spec | `docs/carrinho/issues/09-lacunas-e2e.md:5, 27` | O ticket 09 diz "Os 12 testes de cart.spec.ts", mas antes de `e3f93c2` o arquivo tinha 13 testes (hoje são 17 = 13 + 4). O relatório E2E traz a contagem certa. Só o ticket está inconsistente. | Corrigir para 13 no ticket. |

## O que está bom

- **Camadas:** respeitam `CODING_STANDARDS.md`.
  - Os Controllers só tratam HTTP.
  - Os Repositories convertem violação de unicidade ou escrita sem linha em `null`/`false`.
  - Os Services decidem o erro de domínio, e o envelope de erro mapeia 404/409/422 sem vazar stack trace.
- **Máquina de estados:** `cart-transitions.ts` reproduz a tabela de transições do FRD.
- **Dinheiro** (ADR 0005): tudo em centavos inteiros, inclusive Subtotal, Discount e Total.
- **Coupon:**
  - A expiração usa `now >= expiresAt`, com o relógio injetado.
  - O Coupon é revalidado dentro da transação do `confirm`.
  - O índice único parcial garante o uso único por Shopper, mesmo com confirmações concorrentes, com rollback completo.
- **Confirmação:**
  - Move o Cart primeiro, o que trava a linha.
  - Baixa o Stock com update condicional em ordem de id (ADR 0009) e reporta todos os Products em falta.
  - Grava uma cópia do Coupon no Order (ADR 0010, `inTransaction`).
- **Abandono:** a regra de 24h ociosas (`>=`) é aplicada antes de qualquer operação, e um `GET` não reinicia a contagem.
- **Frontend** (ADR 0003):
  - `fetch` só existe em `api/http.ts`, e o domínio é puro e tem testes unitários.
  - O id do Cart é descartado em `order_created`, `abandoned` e `CART_NOT_FOUND`.
- **Testes:** a cobertura de integração e E2E é ampla e segue os cenários do FRD, com valores esperados vindos de literais conhecidos.

## Correções aplicadas

Os achados viraram três tickets, um commit cada. `make check` e `make test` (31 testes unitários, 130 de integração, 20 E2E) ficaram verdes depois das correções.

| Achado | Decisão | Onde |
| --- | --- | --- |
| R1, R2 | **Corrigidos.** Adicionar, alterar e remover um Cart Item agora releem o Cart com a linha travada (`findByIdForUpdate`, `SELECT … FOR UPDATE OF carts`) dentro de `InTransaction` (ADR 0010) e só então decidem último item, limite de 99 e Stock. Três testes de integração novos cobrem as corridas. Os dois de adição falhavam antes da correção; o das duas remoções passou mesmo antes, em 10 execuções, porque as leituras não chegaram a se intercalar nesta máquina, e fica como teste de regressão. | [Ticket 10](issues/10-decidir-sob-o-lock-do-cart.md), `e6ca2d4` |
| R3, R4 | **Corrigidos.** `CartItemRecord`, `OrderItemRecord`, `NewOrder.items` e o tipo de itens de `cartErrorMessage` viraram `Pick`s de `CartItem`/`OrderItem`; o `CouponRow` do E2E usa `CouponType`. | [Ticket 11](issues/11-tipos-de-item-do-shared.md), `2497ff6` |
| R5 | **Corrigido.** `lineTotalCents` em `backend/src/money.ts`, usado pelos dois Services. | [Ticket 12](issues/12-line-total-unico.md), `ac028a1` |
| R10 | **Corrigido** no texto do ticket 09 (13 testes existentes), no mesmo commit deste relatório. | [Ticket 09](issues/09-lacunas-e2e.md) |
| R6 | **Aceito.** O seed é um script de demonstração com um só ponto de montagem; uma fábrica compartilhada só valeria a pena com um terceiro consumidor. | — |
| R7 | **Aceito.** Código de suporte de teste, curto e estável; o boilerplate repetido não esconde regra nenhuma. | — |
| R8 | **Aceito.** Os dois `CartAction` vivem em módulos que não se importam um ao outro (seed e backend); o risco de confusão é baixo. | — |
| R9 | **Aceito.** Só três módulos de apresentação usam o helper; mover agora é custo sem ganho para o escopo do curso. | — |
