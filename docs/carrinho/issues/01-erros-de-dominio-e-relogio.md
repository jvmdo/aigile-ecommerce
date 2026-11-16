# 01: Prefactor: erros de domínio e relógio injetado

**Spec:** [FRD do Carrinho](../frd-carrinho.md)

**What to build:** preparar o backend para as regras de negócio do Cart sem mudar nenhum comportamento visível. O Service passa a poder lançar um erro de domínio (código estável, mensagem em português e `details` opcional) que o tratador de erros converte no envelope padrão com o status HTTP correspondente ao código. O Service escolhe o código; o mapeamento código → status fica na camada HTTP. A função de montagem da aplicação passa a receber um relógio (`now(): Date`) ao lado do banco e da configuração: o ponto de entrada usa o relógio do sistema e os testes podem passar um relógio controlável.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Existe um erro de domínio com código, mensagem e `details` opcional, sem nenhuma referência a HTTP.
- [ ] O tratador de erros converte o erro de domínio no envelope `{ error: { code, message, details? } }` com o status mapeado pelo código; um código sem mapeamento vira `500` sem vazar a mensagem interna.
- [ ] O mapeamento já contém todos os códigos da tabela de erros de domínio do FRD.
- [ ] A função de montagem da aplicação recebe o relógio como dependência; o ponto de entrada passa o relógio do sistema.
- [ ] Teste de integração na seam do app HTTP prova que um erro de domínio vira o envelope com o status certo e os `details` (por meio de uma rota registrada só no teste).
- [ ] Os testes existentes de products, errors e health continuam passando sem alteração de comportamento.
