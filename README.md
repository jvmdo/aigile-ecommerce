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
| Frontend (catálogo) | <http://localhost:8080> |
| API | <http://localhost:8800> |
| PostgreSQL | `localhost:5432` (usuário e senha `ecommerce`) |

### Verificação

- <http://localhost:8080> mostra o catálogo: nome, descrição, preço em reais e Stock de cada Product, com o selo "Esgotado" quando o Stock é zero. Sem Products, mostra uma mensagem de catálogo vazio; se a API não responde, uma mensagem de erro.
- `GET http://localhost:8080/health` e `GET http://localhost:8080/api/products` passam pelo nginx do frontend e respondem igual à API.
- `GET http://localhost:8800/health` → `200 {"status":"ok"}` quando a API acessa o banco; `503` quando o banco está inacessível.

## API

| Rota | Resposta |
| --- | --- |
| `GET /health` | `200 {"status":"ok"}`, ou `503` quando o banco está inacessível. |
| `GET /api/products` | `200` com todos os Products em ordem alfabética de nome (sem paginação): `[{ "id", "name", "description", "priceCents", "stock" }]`. Catálogo vazio devolve `[]`. Preço em centavos inteiros (`3990` = R$ 39,90). |

Todo erro usa o mesmo envelope: `{ "error": { "code", "message", "details"? } }`. Entrada malformada → `400` (`VALIDATION_ERROR`); rota inexistente → `404`; erro inesperado → `500` (`INTERNAL_ERROR`), sem stack trace. Os schemas das respostas ficam no pacote `shared`.

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

Os testes E2E (Playwright, imagem oficial `mcr.microsoft.com/playwright`) sobem uma stack própria e descartável, o projeto compose `aigile-ecommerce-e2e` (veja [`docker-compose.e2e.yml`](docker-compose.e2e.yml)): banco novo, sem portas publicadas no host. Por isso não apagam os dados de desenvolvimento e podem rodar com `make up` de pé. Cada teste insere os Products de que precisa e acessa o frontend pelo nginx, como o comprador. Ao final, a stack e o volume dela são removidos.

## Comandos (Makefile)

| Alvo | O que faz |
| --- | --- |
| `make up` | Constrói e sobe a stack em segundo plano, esperando os healthchecks. |
| `make down` | Derruba a stack (o volume do banco é mantido). |
| `make logs` | Acompanha os logs de todos os serviços. |
| `make migrate` | Aplica as migrations no banco da aplicação (serviço `migrate`, execução única). |
| `make test` | Suíte completa (unidade, integração e E2E) em containers; falha se qualquer nível falhar. |
| `make test-unit` | Testes de unidade do Domain do frontend (formatação de preço, regra de "Esgotado"), em container. |
| `make test-integration` | Testes de integração do backend contra o database `ecommerce_test`, que é migrado e limpo a cada execução, em containers. |
| `make test-e2e` | Testes E2E com Playwright contra uma stack compose isolada, pelo nginx; remove essa stack ao final. |
| `make dev` | Postgres em container, migrations aplicadas, backend e Vite com recarga automática no host (veja acima). Exige Node 24 e `npm install`. |
| `make check` | `tsc --noEmit` em todos os workspaces e Biome. Exige Node 24 no host e `npm install`. |

O database `ecommerce_test` é criado na primeira inicialização do volume do Postgres. Se o volume já existia antes disso, recrie-o com `docker compose down -v` (apaga os dados locais).

## Estrutura

Monorepo com npm workspaces: `e2e` (testes Playwright), `backend` (Fastify, TypeScript rodando direto no Node 24, sem build), `frontend` (Vite, TypeScript e Web Components nativos, servido por nginx, que faz proxy de `/api/*` e `/health` para a API) e `shared` (contratos da API).

O frontend é separado em camadas: `presentation/` (custom elements da página), `domain/` (funções puras de exibição) e `api/` (único lugar que chama `fetch`). Migrations em `backend/migrations/`, geradas a partir de `backend/src/db/schema.ts` com `npx drizzle-kit generate` (dentro de `backend/`). Decisões em [`docs/adr/`](docs/adr/) e padrões em [`CODING_STANDARDS.md`](CODING_STANDARDS.md).
