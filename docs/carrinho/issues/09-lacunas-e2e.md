# 09: Lacunas do E2E do Carrinho e relatório E2E

**Spec:** [FRD do Carrinho](../frd-carrinho.md): Identidade do Shopper; Cart Items; Regras do Coupon; Abandono por tempo; Testing Decisions

**What to build:** completar a suíte E2E do Cart com as regras que o Shopper vê no navegador e que ainda não têm teste E2E, e escrever o relatório E2E exigido pelo curso. Os 12 testes de [cart.spec.ts](../../../e2e/tests/cart.spec.ts) continuam como estão; entram só os quatro cenários abaixo. Cada teste usa um contexto de navegador novo (um Shopper novo) e insere os próprios dados, como os demais. Mudanças que o sistema não oferece (o tempo passar, o preço mudar) são simuladas direto no banco pelo suporte do E2E, como `setStock` já faz para outra compra.

Decidido no grilling de 18/11/2026: o limite das 24 h (23h59 contra 24h, `GET` sem reiniciar a contagem) continua só na integração, e o E2E cobre apenas o que o Shopper vê. Na tela, um Cart abandonado por tempo aparece como expirado, e o [GLOSSARY.md](../../../GLOSSARY.md) já registra que isso é texto de tela, não outro status.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

### Testes E2E novos

- [ ] **Cart expirado:** o Shopper adiciona um Product; o teste recua 24 h a última alteração do Cart no banco; ao abrir o Cart o Shopper vê "Seu carrinho expirou."; a próxima adição cria um Cart novo, Com itens, só com o Product novo.
- [ ] **Coupon de uso único por Shopper:** o Shopper confirma um Order com `DEZ`; num Cart novo, aplicar `DEZ` mostra a mensagem em português de `COUPON_ALREADY_USED`; um segundo contexto de navegador (outro Shopper) aplica `DEZ` e vê o Discount.
- [ ] **Navegador limpo é um Shopper novo:** com um Cart Com itens, o teste limpa o `localStorage` e recarrega; o Cart aparece vazio.
- [ ] **Preço unitário fixo:** depois de o Shopper adicionar um Product, o teste muda o preço dele no banco; o Cart continua mostrando o preço unitário antigo, e o catálogo mostra o novo.
- [ ] O suporte de banco do E2E ([database.ts](../../../e2e/support/database.ts)) ganha só as funções que esses testes precisam (recuar a última alteração de um Cart, mudar o preço de um Product), no mesmo estilo de `setStock`.

### Documentação

- [ ] O FRD, em Testing Decisions (seam 2, nota sobre o abandono por 24 horas), passa a dizer que o limite das 24 h fica na seam 1, e que o E2E cobre a tela do Cart expirado recuando a última alteração no banco. A lista de cenários do E2E inclui os quatro testes novos.
- [x] [GLOSSARY.md](../../../GLOSSARY.md): **Abandoned** diz que, quando acontece por tempo, o Shopper vê que o Cart expirou (aplicado no grilling).
- [ ] `docs/carrinho/e2e-report-carrinho.md`, em português, com:
  - como rodar (`make test-e2e`) e como a stack E2E é isolada (projeto compose próprio, sem portas publicadas, dados inseridos pelo próprio teste);
  - tabela cenário → teste para todos os testes do Cart (os 12 existentes e os 4 novos);
  - o que fica fora do E2E e por quê, por estar coberto na seam de integração: substituir um Coupon por outro, Discount fixo limitado ao Subtotal, arredondamento do percentual, abandonar a partir do checkout, recusas `409` em status finais, duas abas concorrendo, limite das 24 h;
  - resultado de **3 execuções seguidas** de `make test-e2e`, todas verdes, com o número de testes e o tempo de cada uma.
- [ ] Se alguma execução falhar, a causa é corrigida antes do relatório; não se acrescentam retries na configuração do Playwright para escondê-la.

### Entrega

- [ ] `make test-e2e` passa; `make check` passa.
- [ ] Dois commits no `main`: `test(e2e): lacunas do carrinho` (testes, suporte, FRD, glossário) e `docs: relatório E2E do carrinho` (relatório e fechamento deste ticket, terminando com `Closes docs/carrinho/issues/09-lacunas-e2e.md`).
