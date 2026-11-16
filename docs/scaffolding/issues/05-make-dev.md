# 05: Ciclo de desenvolvimento: `make dev`

**Spec:** [Especificação do Scaffolding](../../scaffolding-specification.md)

**What to build:** o desenvolvedor roda `make dev` (ou `npm run dev`) e tem, num só terminal, o Postgres em container, as migrations aplicadas, o backend com recarga automática e o Vite dev server com proxy para a API, com os logs dos dois processos prefixados e coloridos. Ctrl+C encerra backend e frontend e mantém o Postgres rodando.

**Blocked by:** 03 (Página do catálogo)

**Status:** resolved

- [x] `make dev` sobe só o serviço `db`, espera o healthcheck e aplica as migrations.
- [x] Backend roda com `node --watch` na porta 8800 e o Vite dev server na porta 5173, em paralelo via `concurrently` (devDependency da raiz), com logs prefixados.
- [x] O Vite dev server faz proxy de `/api` e `/health` para a porta 8800, com os mesmos caminhos de produção.
- [x] Alterar um arquivo do backend reinicia o backend; alterar um arquivo do frontend recarrega a página.
- [x] Ctrl+C encerra os dois processos e deixa o Postgres rodando; `make down` derruba tudo.
- [x] `npm run dev` na raiz tem o mesmo efeito, depois de o banco estar de pé.
- [x] README atualizado com o fluxo de `make dev`.
