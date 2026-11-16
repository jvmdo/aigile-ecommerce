# 03: Página do catálogo

**Spec:** [Especificação do Scaffolding](../../scaffolding-specification.md)

**What to build:** o comprador abre `http://localhost:8080` e vê o catálogo: cada Product com nome, descrição, preço formatado em reais e Stock, o selo "Esgotado" quando o Stock é zero, uma mensagem clara quando o catálogo está vazio e uma mensagem de erro amigável quando a API não responde. O frontend usa Vite, TypeScript e Web Components nativos, separado nas camadas Presentation, Domain e API (ADR 0003), e consome o contrato do pacote `shared`. Em produção, um container nginx serve o build e faz proxy para a API.

**Blocked by:** 02 (API do catálogo: `GET /api/products`)

**Status:** resolved

- [x] Frontend com Vite + TypeScript + Web Components nativos, sem biblioteca de UI.
- [x] Camada Domain com funções puras: formatação de centavos em reais e regra de "Esgotado" (Stock igual a zero).
- [x] Camada API: módulo que busca `/api/products`, tipado com os tipos do `shared`.
- [x] Camada Presentation: a página do catálogo renderiza a lista ordenada, o selo "Esgotado", o estado vazio e o estado de erro.
- [x] Serviço `web` no compose: build multi-stage do Vite servido por nginx na porta 8080, com proxy de `/api/*` e `/health` para a API sem reescrever o caminho; sobe só depois de a `api` estar saudável.
- [x] `http://localhost:8080/health` responde igual a `http://localhost:8800/health`.
- [x] Testes de unidade do Domain com Vitest via `make test-unit`: `1999` → "R$ 19,99", `0` → "R$ 0,00", valores com milhar; Stock zero é "Esgotado", Stock positivo não.
- [x] CSS mínimo.
- [x] README atualizado com a URL do frontend e `make test-unit`.
