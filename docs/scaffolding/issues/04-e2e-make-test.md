# 04: E2E e `make test` completo

**Spec:** [Especificação do Scaffolding](../../scaffolding-specification.md)

**What to build:** o avaliador roda um único `make test` e a suíte completa (unidade, integração e E2E) executa inteiramente em containers, terminando com código de saída diferente de zero se qualquer nível falhar. Os testes E2E usam Playwright contra a stack do compose, pelo nginx, e verificam o catálogo como o comprador o vê.

**Blocked by:** 03 (Página do catálogo)

**Status:** ready-for-agent

- [ ] Serviço Playwright no compose com a imagem oficial, ativado só por profile de teste (ADR 0004).
- [ ] Os testes E2E inserem os próprios dados (sem depender do seed do Passo 7).
- [ ] E2E verifica: a página do catálogo exibe os Products do banco com preço em reais; o selo "Esgotado" aparece para Stock zero; `/health` responde `200` via nginx.
- [ ] `make test-e2e` sobe o que for necessário, roda os testes e devolve o código de saída correto.
- [ ] `make test` roda unidade, integração e E2E em containers e falha se qualquer nível falhar.
- [ ] `make test` funciona numa máquina com apenas Docker.
- [ ] README atualizado com `make test` como comando da suíte completa e `make test-e2e`.
