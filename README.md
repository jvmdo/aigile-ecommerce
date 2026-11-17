# aigile-ecommerce

E-commerce simplificado (catálogo, carrinho, cupons e pedidos) desenvolvido com IA no projeto prático do Módulo 6.

## Pré-requisito

Apenas **Docker** (com Docker Compose). Nada mais precisa estar instalado: banco, API e testes rodam em containers.

## Subir o sistema

```sh
docker compose up
```

Antes de a API subir, o serviço `migrate` aplica as migrations do banco e termina; a `api` só inicia se ele concluir com sucesso.

Não é preciso criar `.env`: todas as variáveis têm valor padrão (veja [`.env.example`](.env.example) para ajustá-las).

| Serviço | Endereço |
| --- | --- |
| Frontend (catálogo e carrinho) | <http://localhost:8080> |
| API | <http://localhost:8800> |
| PostgreSQL | `localhost:5432` (usuário e senha `ecommerce`) |

### Verificação

- <http://localhost:8080> mostra o catálogo: nome, descrição, preço em reais e Stock de cada Product, com o selo "Esgotado" quando o Stock é zero. Sem Products, mostra uma mensagem de catálogo vazio; se a API não responde, uma mensagem de erro.
- Em cada Product com Stock há um campo de quantidade e o botão "Adicionar ao carrinho" (desabilitado quando Esgotado). O link "Carrinho" (`#/carrinho`) mostra os itens com preço unitário, quantidade editável ("Atualizar"), subtotal de cada um e botão "Remover", e o Subtotal, em reais; o Cart continua lá depois de recarregar a página. Sem itens, mostra "Seu carrinho está vazio." com um link para o catálogo.
- `GET http://localhost:8080/health` e `GET http://localhost:8080/api/products` passam pelo nginx do frontend e respondem igual à API.
- `GET http://localhost:8800/health` → `200 {"status":"ok"}` quando a API acessa o banco; `503` quando o banco está inacessível.

## API

| Rota | Resposta |
| --- | --- |
| `GET /health` | `200 {"status":"ok"}`, ou `503` quando o banco está inacessível. |
| `GET /api/products` | `200` com todos os Products em ordem alfabética de nome (sem paginação): `[{ "id", "name", "description", "priceCents", "stock" }]`. Catálogo vazio devolve `[]`. Preço em centavos inteiros (`3990` = R$ 39,90). |
| `POST /api/carts` | Corpo `{ "shopperId" }` (UUID gerado pelo navegador). `201` com um Cart novo, `empty`. |
| `GET /api/carts/:id` | `200` com o Cart; `404 CART_NOT_FOUND` se não existe. |
| `POST /api/carts/:id/items` | Corpo `{ "productId", "quantity" }`, quantidade inteira de 1 a 99. `200` com o Cart. Adicionar um Product que já está no Cart soma a quantidade e mantém o preço unitário de quando ele entrou. `422 QUANTITY_LIMIT_EXCEEDED` se a soma passa de 99; `409 INSUFFICIENT_STOCK` se passa do Stock, com `details: [{ "productId", "requested", "available" }]`; `404 PRODUCT_NOT_FOUND` ou `CART_NOT_FOUND`. |
| `PATCH /api/carts/:id/items/:productId` | Corpo `{ "quantity" }`, inteira de 1 a 99. Substitui a quantidade do item e devolve `200` com o Cart; o preço unitário não muda. `409 INSUFFICIENT_STOCK` (com `details`) se passa do Stock atual; `404 CART_ITEM_NOT_FOUND` se o Product não está no Cart. |
| `DELETE /api/carts/:id/items/:productId` | Remove o item e devolve `200` com o Cart; remover o último leva o Cart a `empty` e remove o Coupon aplicado. `404 CART_ITEM_NOT_FOUND` se o Product não está no Cart. |
| `PUT /api/carts/:id/coupon` | Corpo `{ "code" }` (sem diferenciar maiúsculas de minúsculas). Aplica o Coupon, substituindo outro, e devolve `200` com o Cart, `coupon: { code, type, value }`, `discountCents` e `totalCents`. `422 COUPON_NOT_FOUND` ou `COUPON_EXPIRED`; `409 CART_EMPTY` se o Cart está `empty`. Não há API para criar Coupons: eles vêm do seed ou dos testes. |
| `DELETE /api/carts/:id/coupon` | Remove o Coupon e devolve `200` com o Cart; sem Coupon, apenas devolve o Cart. |
| `POST /api/carts/:id/checkout` | Leva o Cart de `with_items` a `checkout` e devolve `200` com o Cart: os itens ficam travados, o Coupon continua editável. `409 CART_EMPTY` se o Cart está `empty`. |
| `POST /api/carts/:id/edit` | Volta de `checkout` para `with_items` e devolve `200` com o Cart, destravando os itens. |
| `POST /api/carts/:id/confirm` | Só a partir de `checkout`. Numa única transação revalida o Coupon, decrementa o Stock de cada item, cria o Order e leva o Cart a `order_created`; devolve `201` com o Order. `422 COUPON_EXPIRED` se o Coupon expirou depois de aplicado; `409 INSUFFICIENT_STOCK` com `details: [{ "productId", "requested", "available" }]` listando **todos** os Products em falta. Em qualquer falha nada muda: sem Order, Stock intacto, Cart em `checkout`. Duas confirmações disputando a última unidade nunca vendem as duas (ADR 0009). |
| `GET /api/orders/:id` | `200` com o Order; `404 ORDER_NOT_FOUND` se não existe. |

Toda rota de Cart devolve o Cart completo: `{ "id", "status", "items": [{ "productId", "name", "unitPriceCents", "quantity", "lineTotalCents" }], "coupon", "subtotalCents", "discountCents", "totalCents" }`, com os itens na ordem em que entraram. Os valores são calculados pelo servidor, em centavos. `coupon` é `{ "code", "type", "value" }` do Coupon aplicado, ou `null`; o Discount percentual é `floor(subtotalCents × value / 100)`, o fixo é `min(value, subtotalCents)`, e `totalCents = subtotalCents − discountCents`, nunca negativo.

O Order é `{ "id", "status": "created", "items": [...], "coupon", "subtotalCents", "discountCents", "totalCents", "createdAt" }`, com itens no mesmo formato dos do Cart. Ele guarda cópias dos itens, dos valores e do Coupon do momento da confirmação: alterar o Coupon depois não muda o Order.

O status segue a máquina de estados do Cart: em `checkout` só se aplica ou remove o Coupon, se volta a editar ou se confirma; `order_created` é final e recusa qualquer alteração; qualquer ação que o status não permite (alterar itens em `checkout`, alterar ou remover itens e remover o Coupon de um Cart `empty`, `edit` num Cart `with_items`, `checkout` repetido, ...) responde `409 INVALID_CART_TRANSITION` com `details: { "status" }`.

Todo erro usa o mesmo envelope: `{ "error": { "code", "message", "details"? } }`. Entrada malformada (inclusive ids que não são UUID) → `400` (`VALIDATION_ERROR`); regra de negócio violada → `404`, `409` ou `422` com um código estável (`CART_NOT_FOUND`, `INSUFFICIENT_STOCK`, ...); rota inexistente → `404`; erro inesperado → `500` (`INTERNAL_ERROR`), sem stack trace. Os schemas das respostas ficam no pacote `shared`.

## Desenvolvimento (`make dev`)

Exige Node 24 no host e `npm install` na raiz, uma vez.

```sh
make dev
```

Sobe só o Postgres em container, espera o healthcheck, aplica as migrations e roda em paralelo, num só terminal e com logs prefixados (`[api]` e `[web]`):

- o backend com `node --watch` em <http://localhost:8800>, que reinicia a cada arquivo do código do backend ou do `shared` alterado;
- o Vite dev server em <http://localhost:5173>, que recarrega a página a cada arquivo alterado no frontend e faz proxy de `/api` e `/health` para a porta 8800, com os mesmos caminhos de produção.

Ctrl+C encerra os dois e deixa o Postgres rodando; `make down` derruba tudo. Com o banco já de pé, `npm run dev` na raiz faz o mesmo que `make dev` sem subir o banco nem migrar.

No host, `make dev` monta o `DATABASE_URL` do backend com os mesmos `POSTGRES_*` do compose (do `.env`, se houver), então mudar a porta ou as credenciais do banco no `.env` vale para os dois. `npm run dev` sozinho usa [`backend/dev.env`](backend/dev.env), com os valores padrão; uma variável definida no shell vale sobre ele (`LOG_LEVEL=debug npm run dev`). Se a stack completa estiver de pé (`make up`), a porta 8800 já está ocupada pela `api` do compose: rode `make down` antes.

## Testes

```sh
make test
```

Roda a suíte completa (unidade, integração e E2E) inteiramente em containers e termina com código de saída diferente de zero se qualquer nível falhar (para no primeiro nível que falha). Só precisa de Docker. Cada nível também roda isolado com `make test-unit`, `make test-integration` e `make test-e2e`.

Os testes E2E (Playwright, imagem oficial `mcr.microsoft.com/playwright`) sobem uma stack própria e descartável, o projeto compose `aigile-ecommerce-e2e` (veja [`docker-compose.e2e.yml`](docker-compose.e2e.yml)): banco novo, sem portas publicadas no host. Por isso não apagam os dados de desenvolvimento e podem rodar com `make up` de pé. Cada teste insere os Products de que precisa (apagando também os Carts) e acessa o frontend pelo nginx, como o comprador. Ao final, a stack e o volume dela são removidos.

## Comandos (Makefile)

| Alvo | O que faz |
| --- | --- |
| `make up` | Constrói e sobe a stack em segundo plano, esperando os healthchecks. |
| `make down` | Derruba a stack (o volume do banco é mantido). |
| `make logs` | Acompanha os logs de todos os serviços. |
| `make migrate` | Aplica as migrations no banco da aplicação (serviço `migrate`, execução única). |
| `make test` | Suíte completa (unidade, integração e E2E) em containers; falha se qualquer nível falhar. |
| `make test-unit` | Testes de unidade do Domain do frontend (formatação de preço, regra de "Esgotado", validação de quantidade, mensagens por código de erro), em container. |
| `make test-integration` | Testes de integração do backend contra o database `ecommerce_test`, que é migrado e limpo a cada execução, em containers. |
| `make test-e2e` | Testes E2E com Playwright contra uma stack compose isolada, pelo nginx; remove essa stack ao final. |
| `make dev` | Postgres em container, migrations aplicadas, backend e Vite com recarga automática no host (veja acima). Exige Node 24 e `npm install`. |
| `make check` | `tsc --noEmit` em todos os workspaces e Biome. Exige Node 24 no host e `npm install`. |

O database `ecommerce_test` é criado na primeira inicialização do volume do Postgres. Se o volume já existia antes disso, recrie-o com `docker compose down -v` (apaga os dados locais).

## Estrutura

Monorepo com npm workspaces: `e2e` (testes Playwright), `backend` (Fastify, TypeScript rodando direto no Node 24, sem build), `frontend` (Vite, TypeScript e Web Components nativos, servido por nginx, que faz proxy de `/api/*` e `/health` para a API) e `shared` (contratos da API).

O frontend é separado em camadas: `presentation/` (custom elements das páginas, com navegação por hash entre `#/`, `#/carrinho` e `#/pedido/:id`, a confirmação do Order), `domain/` (funções puras de exibição e validação) e `api/` (único lugar que chama `fetch` e que lê e grava o Shopper id e o Cart id no `localStorage`). Migrations em `backend/migrations/`, geradas a partir de `backend/src/db/schema.ts` com `npx drizzle-kit generate` (dentro de `backend/`). Decisões em [`docs/adr/`](docs/adr/) e padrões em [`CODING_STANDARDS.md`](CODING_STANDARDS.md).
