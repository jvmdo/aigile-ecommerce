# 01: Esqueleto de pé: `/health` de ponta a ponta

**Spec:** [Especificação do Scaffolding](../../scaffolding-specification.md)

**What to build:** o avaliador roda `docker compose up` numa máquina que só tem Docker e, sem criar nenhum `.env`, obtém um PostgreSQL saudável e a API respondendo em `/health`: `200 { status: "ok" }` quando o banco está acessível e `503` quando não está. É a fundação do monorepo (npm workspaces com `backend`, `frontend` e `shared`, Node 24 com type stripping, Biome) e da seam de integração: a aplicação é montada a partir das dependências recebidas e testada com `inject()` contra o banco real.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Monorepo com npm workspaces (`backend`, `frontend`, `shared`) e tsconfig base com `erasableSyntaxOnly` e `rewriteRelativeImportExtensions` (ADR 0007).
- [ ] O backend roda TypeScript direto no Node 24, sem etapa de build.
- [ ] A aplicação Fastify é montada por uma função que recebe as dependências (conexão com o banco, configuração) e não dá `listen`; um ponto de entrada separado lê a configuração e dá `listen` na porta 8800.
- [ ] A configuração vem de variáveis de ambiente, é validada ao iniciar e derruba o processo com mensagem clara se for inválida.
- [ ] `GET /health` executa `SELECT 1` e responde `200 { status: "ok" }` com o banco acessível e `503` com o banco inacessível.
- [ ] O compose tem `db` (Postgres com healthcheck e volume nomeado) e `api` (dependendo do `db` saudável, com healthcheck em `/health`); todas as variáveis têm padrão `${VAR:-default}`, e `docker compose up` funciona sem `.env`.
- [ ] O database `ecommerce_test` existe no mesmo serviço Postgres.
- [ ] Testes de integração do `/health` (200 com banco real; 503 com conexão inválida nas dependências) rodam em container via `make test-integration`.
- [ ] Makefile com `up`, `down`, `logs`, `check` (`tsc --noEmit` em todos os workspaces + Biome) e `test-integration`.
- [ ] Biome configurado para o monorepo, e `make check` passa.
- [ ] `.gitignore` cobre dependências, builds, relatórios de teste e `.env`; `.env.example` documenta cada variável e seu padrão.
- [ ] README atualizado: pré-requisito (só Docker), `docker compose up`, porta da API, `/health` e os alvos do Makefile existentes.
