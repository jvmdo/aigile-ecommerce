# Comparação: FRD original × FRD por engenharia reversa

Passo 10 do curso. Compara o [FRD do Carrinho](frd-carrinho.md), escrito antes do código (Passo 2), com o [FRD por engenharia reversa](reverse-frd-carrinho.md), reconstruído só a partir do código final.

## Como foi feito

1. **FRD reverso:** um agente em contexto limpo, sem acesso a `docs/`, `GLOSSARY.md`, `README.md`, `CODING_STANDARDS.md`, `CLAUDE.md`, ao enunciado e ao histórico do git, leu o código, os testes, as migrations e a configuração e escreveu o FRD no mesmo template do original. Uma contaminação ficou inevitável: alguns comentários do código citam o nome de seções do FRD (ex.: `(FRD, "Cart Items")`). O agente foi instruído a tirar as regras do que o código faz, não dessas citações.
2. **Comparação:** feita depois, com os dois documentos abertos, regra por regra. Onde o FRD reverso marcou algo como *inferência*, conferi no código. Duas inferências foram confirmadas executando a API local (coerção de tipos e espaços no código do Coupon, abaixo).

Cada regra recebe um veredito:

- **igual**: os dois documentos descrevem o mesmo comportamento;
- **refinada**: o código faz o que o original pede e o reverso descreve com mais precisão;
- **divergente**: o código não faz exatamente o que o original diz;
- **só no original**: intenção que o código não revela;
- **só no reverso**: comportamento que o original não especificou.

## Resumo

- A **espinha** da feature foi reconstruída sem perda: os cinco estados e a tabela de transições, as 12 rotas com seus status, os 11 códigos de erro de domínio com status HTTP, a aritmética do dinheiro, a transação de confirmação e o abandono por 24 horas batem com o original, inclusive nos limites (99 unidades, `agora >= expiração`, 24h00 abandona e 23h59 não).
- **Divergências reais** entre o FRD original e o código: 4, todas pequenas (seção "Divergências").
- O reverso traz **mais precisão** que o original em vários pontos: ordem de verificação das regras, mensagens exatas da interface, constraints do banco e o lock das alterações de itens. Parte disso veio depois do FRD, nas correções dos Passos 5 e 9.
- O que **se perdeu** na reconstrução foi o **porquê**: as razões de cada decisão (por que a confirmação é tudo ou nada, por que um Cart Vazio não é abandonado, por que o Shopper id vem do navegador), os papéis "dono da loja" e "avaliador" nas user stories e a ligação com o enunciado do curso (lacunas propositais, Diagram Prompting).
- Das 17 notas do reverso em "Further Notes": 9 o original já resolvia como decisão, explícita ou implícita; 4 apontam lacunas reais do original; 3 coincidem com riscos aceitos no [relatório de segurança](security-report-carrinho.md); 1 é uma divergência (D2).

## Comparação por área

| Área | FRD original | FRD reverso | Veredito |
| --- | --- | --- | --- |
| Problem Statement e Solution | Parte do enunciado do curso: máquina de estados exigida, lacunas propositais (desconto, Stock, validação) | Descreve o mesmo problema a partir do produto, sem citar o curso | igual no conteúdo; o contexto do curso só no original |
| User Stories | 57, com papéis Shopper, dono da loja, desenvolvedor e avaliador | 31, quase todas do Shopper, algumas da "loja" | igual nas histórias do Shopper; as de desenvolvedor e avaliador (54–57) só no original |
| Identidade do Shopper | UUID v4 via `crypto.getRandomValues()` no `localStorage`; Cart id descartado em `order_created`, `abandoned` e `CART_NOT_FOUND` | Igual, com as chaves (`aigile.shopperId`, `aigile.cartId`) e a falha silenciosa do `localStorage` | refinada |
| Máquina de estados | Tabela de 7 linhas, `CART_EMPTY` para Coupon e checkout em `empty`, demais → `INVALID_CART_TRANSITION` | Tabela de 16 linhas com cada ação, mesmo resultado; o estado é verificado antes das outras regras | igual; o reverso explicita a precedência |
| Cart Items | 1..99, soma com o mesmo Product, Stock sem reserva, preço fixo, último item → `empty` sem Coupon | Igual, com a ordem das verificações e a ordem de exibição (`insertion_order`) | refinada |
| Concorrência nas alterações de itens | Não trata | Alterações de itens releem o Cart com `SELECT … FOR UPDATE` | só no reverso (ticket 10, Passo 5) |
| Regras do Coupon | Código em maiúsculas, `agora < expiração`, um por Cart, uso único por Shopper com índice parcial, sem acúmulo | Igual, com limite de 64 caracteres no código | igual; os 64 caracteres só no reverso |
| Cálculo do dinheiro | `floor` no percentual, `min` no fixo, Total ≥ 0, tudo em centavos no backend | Idêntico | igual |
| Confirmação | Ordem: revalida Coupon → baixa Stock → cria Order → move o Cart | Ordem: move o Cart (trava a linha) → relê → revalida Coupon → baixa Stock → cria Order | **divergente** na ordem; mesmo efeito observável (ver D1) |
| Order | Cópias de itens, dinheiro e Coupon; nasce `created`; sem listagem nem transições | Igual, mais `orders.cart_id` único e o nome do item vindo do Product atual | refinada; o nome vivo no Order só no reverso (ver L1) |
| Abandono | 24 h sem alteração, sob demanda, `GET` não reinicia a contagem, `empty` nunca | Igual, com a escrita condicional ao `last_changed_at` lido | igual |
| Banco de dados | 5 tabelas, constraints de faixa, unicidades e índice parcial | Igual, com cada constraint, as FKs e a falta de índices em `shopper_id` | refinada |
| Contrato da API | 12 rotas, ids validados como UUID | As mesmas 12, mais `/api/products` e `/health`; UUID estrito 8-4-4-4-12 | igual; o UUID estrito veio do ticket 14 (Passo 9) |
| Erros de domínio | 11 códigos com status | Os mesmos 11, mais as mensagens da API e os erros não de domínio | igual |
| Frontend | Rotas por hash, ações por status, Domain puro, "Seu carrinho expirou" | Igual, com todos os textos da interface | refinada; uma divergência na validação de quantidade (ver D3) |
| Testing Decisions | Três seams com a lista de cenários | As mesmas três seams, com o que cada camada cobre de fato | igual |
| Out of Scope | Ciclo do Order, criação de Coupons, reserva de Stock, job de abandono, autenticação, pagamento | O mesmo, mais busca no catálogo e internacionalização | igual |

## Divergências entre o FRD original e o código

| # | FRD original | Código (pelo reverso) | Avaliação |
| --- | --- | --- | --- |
| D1 | A confirmação revalida o Coupon (existência, expiração, uso único), baixa o Stock, cria o Order e **por último** move o Cart. | Move o Cart **primeiro**, o que trava a linha, e então relê itens e Coupon. A existência do Coupon não é reconferida: a FK de `carts.coupon_id` impede que ele seja apagado enquanto aplicado. | Divergência só de ordem, escolhida na implementação da confirmação (ticket 06) para que itens e Coupon não mudem antes do commit. O resultado visível é o mesmo: tudo ou nada, com o Cart em `checkout` após qualquer falha. O FRD poderia ser atualizado. |
| D2 | "Schema TypeBox na borda (tipos, UUIDs, faixas)". | O Fastify converte tipos e ignora campos extras: `{"quantity": "2", "extra": 1}` é aceito como quantidade 2 (**executado** contra a API local). | Divergência leve: a faixa continua garantida, mas o tipo não é estrito. Nenhum teste cobre. Aceitável para o projeto; desligar `coerceTypes` seria uma decisão consciente, não uma correção óbvia. |
| D3 | Domain do frontend valida a quantidade "entre 1 e 99 e até o Stock exibido". | Vale no catálogo. Na página do Cart, só 1..99: o Cart não conhece o Stock, e o servidor recusa com `INSUFFICIENT_STOCK`. | Divergência pequena e sensata. O FRD não distinguiu as duas telas. |
| D4 | "Código sem diferenciar maiúsculas" (nada sobre espaços). | O frontend tira os espaços das pontas; a API não: `" natal10"` direto na API → `422 COUPON_NOT_FOUND` (**executado**). | Lacuna do original mais do que divergência: o comportamento pela interface é o esperado. |

## O que só o original sabe

- **As razões das decisões.** Por exemplo: o texto do curso diz "qualquer estado → Abandonado", mas vale o diagrama, porque um Cart Vazio não tem o que perder; `crypto.getRandomValues()` em vez de `randomUUID()` porque este só existe em contexto seguro; remover o último item retira o Coupon para que um Cart Vazio nunca carregue Coupon. O reverso registra o *quê*, nunca o *porquê*.
- **A ligação com o curso:** lacunas propositais fechadas, tabela de transições como artefato de Diagram Prompting, decisão de desenvolver direto no `main`.
- **As histórias de quem não é Shopper:** o desenvolvedor que quer o envelope estável e o Cart completo em toda resposta; o avaliador que quer `make test` cobrindo o fluxo.
- **O nome do conceito:** o original usa o vocabulário do glossário (Shopper, Cart Item, Discount). O reverso reconstruiu a maior parte pelos identificadores do código, mas mistura "Desconto"/"cupom"/"carrinho" com os termos do glossário.

## O que só o reverso sabe

Comportamento real que o original não especificou:

| # | Achado do reverso | Situação |
| --- | --- | --- |
| L1 | O nome dos itens do Order vem do Product atual; renomear um Product muda Orders antigos na exibição (nota 5 do reverso). | **Lacuna do original.** O FRD diz que o nome do Cart vem do Product atual, mas não diz nada sobre o Order. Em um sistema real o nome também seria copiado na confirmação. |
| L2 | Um Coupon que expira, ou é usado em outro Cart do mesmo Shopper, depois de aplicado continua mostrando o Discount no Cart até a confirmação (nota 4). | **Decisão implícita do original** (histórias 32 e 42: revalidar na confirmação), mas a consequência na tela não foi escrita. |
| L3 | Abandonar é permitido em `checkout` pela API, mas a página não mostra o botão em `checkout` (nota 2). | **Igual ao original**, que lista "Abandonar carrinho" só em `with_items`. O reverso não tinha como saber que era intencional. |
| L4 | Cart abandonado manualmente em outra aba aparece como "Seu carrinho expirou." (nota 3). | **Igual ao original**, que pede essa mensagem para qualquer Cart Abandonado; o glossário registra que é texto de tela. |
| L5 | `GET` grava o abandono por tempo (nota 1). | **Igual ao original**, que pede exatamente isso por não haver job. |
| L6 | Mensagens da API e do frontend diferem (nota 7). | **Igual ao original**: o frontend tem a própria tabela de mensagens por código. |
| L7 | `CART_EMPTY` só para Coupon e checkout; abandonar, editar, confirmar e remover Coupon em `empty` dão `INVALID_CART_TRANSITION` (nota 11). | **Igual ao original**, palavra por palavra. |
| L8 | Adicionar pelo catálogo com o Cart em `checkout` mostra só a mensagem genérica de transição (nota 12). | **Lacuna de UX do original.** |
| L9 | Uso único conta pelo código do Coupon, não pela linha (nota 6). | **Igual ao original** (índice sobre Shopper e código). |
| L10 | Vários Carts por Shopper, `shopperId` não verificado, ids dão acesso total (nota 13); colunas de dinheiro de 32 bits (nota 14); sem limpeza de Carts (nota 16). | **Riscos aceitos** no [relatório de segurança](security-report-carrinho.md) (S1, S3, S5, S10). |
| L11 | Products referenciados por itens não podem ser apagados (nota 15). | **Lacuna do original**, sem efeito hoje: não há API para apagar Products. |
| L12 | Coerção de tipos e espaços no código do Coupon (notas 8 e 9). | Ver D2 e D4. |

A nota 10 do reverso (Stock sem reserva) e a nota 17 (o que o código não diz: governança de Coupons e Products, se 99 e 24 h são regras de negócio) estão respondidas no original: Stock sem reserva é decisão explícita, Coupons vêm do seed, e 99 e 24 h foram decididos no brainstorming.

## Conclusões

1. **O código é uma boa fonte do comportamento.** Um leitor sem nenhum documento reconstruiu todas as regras verificáveis da feature, com os números exatos. Isso se deve à máquina de estados centralizada em `cart-transitions.ts`, aos contratos no `shared` e aos testes de integração, que descrevem cada regra pelo nome.
2. **O código não guarda intenção.** Nove das 17 dúvidas do reverso já eram decisões explícitas no original. Sem o FRD, um mantenedor poderia "corrigir" comportamentos intencionais, como mostrar "expirou" para todo Cart abandonado ou esconder o abandono no checkout.
3. **O FRD ficou atrás do código** em três pontos que valeria atualizar: a ordem da confirmação (D1), o lock das alterações de itens (ticket 10) e o UUID estrito (ticket 14).
4. **Lacunas reais que só o reverso expôs:** o nome do item do Order não é copiado (L1) e a mensagem genérica ao adicionar durante o checkout (L8). Nenhuma é defeito diante do FRD; ficam como candidatas a uma próxima iteração.
