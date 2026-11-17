# 02: API do catálogo: `GET /api/products`

**Spec:** [Especificação do Scaffolding](../../scaffolding-specification.md)

**What to build:** `GET /api/products` devolve todos os Products do banco, ordenados por nome, cada um com `{ id, name, description, priceCents, stock }`, ou uma lista vazia quando o catálogo está vazio. As migrations são aplicadas automaticamente por um serviço de execução única antes de a API subir. O contrato de Product e o envelope de erro único (`{ error: { code, message, details? } }`) passam a viver no pacote `shared`, e o módulo `products` estabelece o padrão Controller → Service → Repository que as features vão seguir.

**Blocked by:** 01 (Esqueleto de pé: `/health` de ponta a ponta)

**Status:** resolved

- [x] Tabela de Products via migration do Drizzle: `id` UUID gerado pelo banco, `name` obrigatório, `description`, `price_cents` inteiro maior ou igual a 0 e `stock` inteiro maior ou igual a 0, com constraints de check (ADRs 0002, 0005, 0006).
- [x] Serviço `migrate` no compose: aplica as migrations e termina; a `api` só sobe depois de ele concluir com sucesso. `make migrate` disponível.
- [x] Pacote `shared` exporta os schemas TypeBox (e os tipos derivados) de Product, da resposta da listagem, da resposta do health e do envelope de erro.
- [x] O Fastify usa o type provider de TypeBox, com validação e serialização a partir dos schemas do `shared`.
- [x] Módulo `products` com Controller, Service e Repository; o Repository encapsula o Drizzle.
- [x] `GET /api/products` devolve todos os Products ordenados por nome (crescente), sem paginação.
- [x] Erros de validação de schema viram `400` e erros inesperados viram `500`, ambos no envelope de erro e sem stack trace. O teste do `400` fica para a primeira rota com entrada (feature do Cart).
- [x] Testes de integração no `ecommerce_test` (migrado e limpo a cada execução): campos do contrato, ordem por nome, catálogo vazio, Product com Stock zero.
- [x] README atualizado com `GET /api/products` e `make migrate`.

## Comments

- **Teste do `400` adiado e depois coberto.** No scaffolding não havia rota com entrada, então o teste do `400` ficou para a feature do Cart (só um comentário em `backend/test/integration/errors.test.ts`). Ele foi coberto em `backend/test/integration/carts.test.ts` (`responds 400 VALIDATION_ERROR ...`), no commit `219f256` (ticket `docs/carrinho/issues/02-adicionar-e-ver-cart.md`). Por isso o critério está marcado.
