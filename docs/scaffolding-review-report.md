# Relatório de revisão: scaffolding

Revisão em dois eixos (Standards e Spec) do diff `git diff 29d159f...HEAD`, gerada com `/code-review`. Cada eixo foi revisado por um sub-agente separado, e os achados não foram mesclados nem reordenados entre os eixos.

## Escopo

**Ponto fixo:** `29d159f`

**Commits revisados:**

| Commit | Mensagem | Ticket |
| --- | --- | --- |
| `b954c87` | feat: esqueleto do monorepo com /health de ponta a ponta | `docs/scaffolding/issues/01-esqueleto-health.md` |
| `dbf6671` | feat: API do catálogo com GET /api/products | `docs/scaffolding/issues/02-api-catalogo.md` |
| `5d6b422` | feat: página do catálogo servida por nginx na porta 8080 | `docs/scaffolding/issues/03-pagina-catalogo.md` |
| `f829a64` | docs: ADR 0005 formata dinheiro só no Domain do frontend | — |
| `fdbba23` | feat: testes E2E com Playwright e make test completo | `docs/scaffolding/issues/04-e2e-make-test.md` |
| `a70bfc7` | feat: ciclo de desenvolvimento com make dev | `docs/scaffolding/issues/05-make-dev.md` |

**Fontes de standards:** `CODING_STANDARDS.md`, `CLAUDE.md`, `GLOSSARY.md`, `docs/adr/0001` a `0008` e `biome.json`. O que o Biome já garante ficou fora da revisão. Além dessas fontes, os revisores aplicaram uma lista base de code smells de Fowler (_Refactoring_, cap. 3). Esses smells contam sempre como julgamento, e um standard documentado no repo prevalece sobre eles.

**Fontes de spec:** `docs/scaffolding-specification.md`, `docs/scaffolding-blueprint.md` e os tickets 01 a 05 em `docs/scaffolding/issues/`.

## Standards

### (a) Violações de standards documentados

**Nenhuma violação dura encontrada.** Os pontos conferidos foram:

- **ADR 0008 (versões fixadas):** todas as versões dos `package.json` estão dentro das faixas da tabela. Isso inclui `typescript ~5.8`, `fastify ^5.12.8`, `@sinclair/typebox ~0.34.52`, `@fastify/type-provider-typebox ^5.2.0`, `drizzle-orm ~0.44.7`, `drizzle-kit ~0.31.11`, `pg ^8`, `vite ^6.4.6`, `vitest ^3.2.7`, `@playwright/test 1.52.0` e `@biomejs/biome 1.9.4`. As imagens também conferem: `node:24-alpine`, `postgres:17-alpine`, `nginx:1.27-alpine` e `playwright:v1.52.0-noble`.
- **Camadas do backend:** Controller, Service e Repository estão separados por feature, e as dependências são injetadas em `buildApp`.
- **Erros:** todas as respostas usam o envelope compartilhado, e nenhum stack trace vaza.
- **Contratos:** ficam em `shared`.
- **Frontend:** `fetch` só aparece em `api/`.

### (b) Julgamentos (standard ou smell)

1. **Regra de exibição fora do Domain** (`CODING_STANDARDS.md`, "Frontend layers": _"Formatting and display rules live here"_).
   - O rótulo `"Esgotado"` está na Presentation, em `frontend/src/presentation/product-card.ts:18`.
   - Já o rótulo `"Estoque: …"` está no Domain, em `frontend/src/domain/stock.ts:9-10`. O badge deveria seguir o mesmo caminho.
2. **Duplicated Code nos testes de integração.** O mesmo bloco de preparação aparece 5 vezes:
   ```ts
   const database = createDatabase(...);
   const app = buildApp({ db: database.db, config: { logLevel: "silent" } });
   afterAll(async () => { await app.close(); await database.close(); });
   ```
   - Ocorrências: `backend/test/integration/errors.test.ts:10-16`, `health.test.ts:52-58` e `:79-85`, e `products.test.ts:108-118` e `:195-201`.
   - A URL `"postgres://nobody:wrong@127.0.0.1:1/missing"` também se repete, em `health.test.ts:79` e `products.test.ts:195`.
   - Sugestão: extrair um helper para `test/support`.
3. **Duplicated Code entre pacotes.** `requireDatabaseUrl` (`e2e/support/database.ts:12-18`) e `requireTestDatabaseUrl` (`backend/test/support/test-database-url.ts:2-8`) têm a mesma forma. Por estarem em pacotes diferentes, a duplicação é aceitável.
4. **Data Clump.**
   - Em `e2e/support/database.ts:4-9`, `ProductRow` redeclara `name`, `description`, `priceCents` e `stock`, que são os campos de `Product` sem o `id`.
   - É a forma de uma linha do banco, não de uma resposta da API, então a regra de "Contracts" não se aplica.
   - Mesmo assim, `Omit<Product, "id">` vindo de `@aigile/shared` evitaria que os dois tipos divergissem.
5. **Shotgun Surgery.** Em `backend/src/config.ts`, cada variável de ambiente nova exige editar três trechos em sincronia: o schema (`:4-13`), o `candidate` (`:21-26`) e o mapa `envNames` (`:37-42`).
6. **Primitive Obsession (leve).** Os códigos de erro (`"DATABASE_UNAVAILABLE"`, `"NOT_FOUND"`, …) são `string` livre em `errorBody` (`backend/src/http/error-handler.ts:6`). Uma união literal em `shared` ajudaria quando entrarem os erros de domínio do Cart.
7. **Mysterious Name / GLOSSARY (leve).** Em `frontend/src/presentation/catalog-page.ts:45`, uma variável se chama `const item` e fica ao lado de Product, mas o GLOSSARY diz _Avoid: Item_ para Product. Sugestão: `listItem` ou `entry`.

### Smells suprimidos por standards do repo

- **Middle Man:** `ProductsService.listProducts` (`products.service.ts:10`) só repassa a chamada ao Repository, mas a separação em camadas é exigida pelo `CODING_STANDARDS.md`.
- **Primitive Obsession:** `priceCents: number` é endossado pela ADR 0005.

## Spec

Os 5 tickets estão substancialmente atendidos. Todos os critérios de aceite têm código correspondente:

- `/health` com 200 e 503;
- `GET /api/products` ordenado;
- serviço `migrate` de execução única;
- envelope de erro no `shared`;
- camadas Domain, API e Presentation no frontend;
- proxy no nginx;
- `make test`, `test-*`, `dev` e `check`;
- `.env.example` e README.

### (a) Faltando ou parcial

- **Node 24 não está em todo lugar.**
  - Spec: _"Node 24 em todo lugar (host de dev e imagens)"_ (`scaffolding-specification.md:78`, reforçado em `:193`).
  - A imagem do Playwright roda Node 22 (`e2e/Dockerfile:3,11`).
  - A exceção foi registrada na ADR 0008, mas a spec não foi atualizada.
- **O serviço de E2E não está no `docker-compose.yml`.**
  - Spec: _"Um serviço de testes E2E com a imagem oficial do Playwright, ativado só por profile de teste"_ (spec:128) e _"Na raiz: `docker-compose.yml`..."_ (spec:77).
  - O serviço está num arquivo à parte, `docker-compose.e2e.yml:20-34`, e roda como projeto compose separado.
  - O profile `test` existe e a ADR 0004 foi atualizada. Mesmo assim, o critério do ticket 04 ("Serviço Playwright no compose") é cumprido só em parte, com uma mudança de desenho que a spec não previa.
- **`ecommerce_test` só existe com volume novo.**
  - Ticket 01: _"O database `ecommerce_test` existe no mesmo serviço Postgres."_
  - O banco é criado só na primeira inicialização do volume (`docker/postgres/init-test-database.sql:2`, `docker-compose.yml:16`). Com um volume que já existia, `make test-integration` falha.
  - O README:92 documenta o contorno (`docker compose down -v`).

### (b) Fora do escopo pedido

- **Quarto workspace, `e2e`** (`package.json:5`). A spec diz _"três pacotes: backend, frontend e shared"_ (spec:76).
- **Handler de 404 e repasse de status 4xx no envelope** (`backend/src/http/error-handler.ts:27-40`), com teste em `errors.test.ts:18`. A spec só pede 400, 500 e a previsão de 409/422 (spec:94). É inofensivo, mas não foi pedido.
- **Ordenação com collation ICU `pt-BR-x-icu`** (`products.repository.ts:24`), com teste de acentos e maiúsculas (`products.test.ts:63-77`). A spec pede só _"ordenados por nome (crescente)"_ (spec:100). A collation é razoável pela user story 15, mas é um acréscimo.
- **Testes não pedidos:**
  - resiliência a conexões derrubadas (`health.test.ts:41-48`);
  - resposta 500 em `/api/products` com o banco fora (`products.test.ts:97-115`).
- **Extras pequenos no Domain e no compose:**
  - `formatStock` no Domain (`frontend/src/domain/stock.ts:9`);
  - healthcheck no serviço `web` (`docker-compose.yml:74`), que é necessário para o E2E.

### (c) Implementado, mas com divergência

- **`description` virou obrigatória.**
  - Spec: _"`name` texto obrigatório, `description` texto"_ (spec:106). A spec só exige `name`.
  - Na migration, `description` é `NOT NULL DEFAULT ''` (`backend/migrations/0000_create_products.sql:4`, `schema.ts:10`).
  - A decisão chega ao contrato: `shared/src/product.ts:7` usa `Type.String()`, sem `Optional` nem `null`.
  - Convém confirmar se foi intencional.
- **`make test` para no primeiro nível que falha.**
  - Spec: _"falha se qualquer nível falhar"_ (spec:136).
  - O código de saída está correto, mas os níveis seguintes não chegam a rodar (`Makefile:44`).
  - O README:73 documenta o comportamento. É aceitável; fica só o registro.
- **O teste do 400 foi adiado.**
  - Spec: _"erro de validação devolve `400`... (ou registrado para cobrir quando a primeira [rota com entrada] aparecer)"_ (spec:166).
  - O adiamento ficou registrado só como comentário em `backend/test/integration/errors.test.ts:8`, sem `it.todo` nem teste pendente.
  - Isso cumpre a letra da spec, mas é fácil de esquecer na feature do Cart.

Nenhum critério de aceite dos tickets 02, 03 e 05 ficou sem implementação.

## Resumo

- **Standards:** nenhuma violação dura e 7 julgamentos. O mais relevante é o rótulo `"Esgotado"` na Presentation, que contraria a regra de exibição no Domain do `CODING_STANDARDS.md`.
- **Spec:** 11 achados (3 faltando ou parciais, 5 fora do escopo, 3 divergências). O mais relevante é o serviço E2E num compose separado, fora do `docker-compose.yml` previsto pela spec, o que deixa o ticket 04 atendido só em parte.

## Correções aplicadas após a revisão

- **Rótulo "Esgotado" no Domain** (Standards, item 1): o rótulo virou a constante `SOLD_OUT_LABEL` em `frontend/src/domain/stock.ts`. O `product-card.ts` passou a usá-la, e há um teste de unidade para ela.
- **Spec alinhada às decisões já registradas em ADRs** (Spec, itens a e c):
  - `scaffolding-specification.md` agora registra o workspace `e2e`, o override `docker-compose.e2e.yml` com projeto compose próprio (ADR 0004) e a exceção do Node 22 na imagem do Playwright (ADR 0008).
  - `description` ficou como texto não nulo com padrão `''`, mantendo o contrato atual.
  - O critério do ticket 04 passou a citar o override.
- **Verificação:** `npm run check` passou, os testes de unidade passaram (8 de 8) e `make test-e2e` passou (3 de 3).

Os demais julgamentos, como a duplicação nos testes de integração, os códigos de erro tipados e o nome `item`, ficam para quando a feature do Cart mexer nesses pontos.
