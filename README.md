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

## Comandos (Makefile)

| Alvo | O que faz |
| --- | --- |
| `make up` | Constrói e sobe a stack em segundo plano, esperando os healthchecks. |
| `make down` | Derruba a stack (o volume do banco é mantido). |
| `make logs` | Acompanha os logs de todos os serviços. |
| `make migrate` | Aplica as migrations no banco da aplicação (serviço `migrate`, execução única). |
| `make test-unit` | Testes de unidade do Domain do frontend (formatação de preço, regra de "Esgotado"), em container. |
| `make test-integration` | Testes de integração do backend contra o database `ecommerce_test`, que é migrado e limpo a cada execução, em containers. |
| `make check` | `tsc --noEmit` em todos os workspaces e Biome. Exige Node 24 no host e `npm install`. |

O database `ecommerce_test` é criado na primeira inicialização do volume do Postgres. Se o volume já existia antes disso, recrie-o com `docker compose down -v` (apaga os dados locais).

## Estrutura

Monorepo com npm workspaces: `backend` (Fastify, TypeScript rodando direto no Node 24, sem build), `frontend` (Vite, TypeScript e Web Components nativos, servido por nginx, que faz proxy de `/api/*` e `/health` para a API) e `shared` (contratos da API).

O frontend é separado em camadas: `presentation/` (custom elements da página), `domain/` (funções puras de exibição) e `api/` (único lugar que chama `fetch`). Migrations em `backend/migrations/`, geradas a partir de `backend/src/db/schema.ts` com `npx drizzle-kit generate` (dentro de `backend/`). Decisões em [`docs/adr/`](docs/adr/) e padrões em [`CODING_STANDARDS.md`](CODING_STANDARDS.md).
