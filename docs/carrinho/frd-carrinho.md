# FRD do Carrinho

**Status:** ready-for-agent

Decisões de fundo: [GLOSSARY.md](../../GLOSSARY.md), ADRs [0005](../adr/0005-money-as-integer-cents.md) (dinheiro em centavos e regra de arredondamento), [0006](../adr/0006-uuid-identifiers.md) (UUIDs) e [0009](../adr/0009-stock-decrement-by-conditional-update.md) (decremento de Stock), e [CODING_STANDARDS.md](../../CODING_STANDARDS.md).

## Problem Statement

O e-commerce hoje só lista o catálogo de Products. O Shopper vê o que existe e quanto custa, mas não consegue comprar nada: não há onde juntar os Products que quer, ajustar quantidades, aplicar um Coupon de desconto nem transformar essa escolha num Order. O curso exige que o Cart seja gerido por uma máquina de estados (Vazio, Com Itens, Em Checkout, Pedido Criado, Abandonado) e deixa em aberto, de propósito, as regras de desconto, o comportamento do Stock durante a compra e o nível de validação. Sem essas regras fechadas, dois Shoppers poderiam comprar a última unidade do mesmo Product, um Coupon poderia gerar Total negativo e o Cart poderia ser alterado no meio da confirmação.

## Solution

O Shopper ganha um Cart, criado na primeira vez que adiciona um Product. No Cart ele adiciona Products, altera quantidades, remove itens e aplica um Coupon, sempre vendo Subtotal, Discount e Total calculados pelo servidor. Quando está satisfeito, inicia o checkout: o Cart fica travado para revisão, e ele pode voltar a editar ou confirmar o Order. A confirmação é tudo ou nada: ou o Order é criado, o Stock é decrementado e o Cart passa a Pedido Criado, ou nada muda e o Shopper vê exatamente quais Products estão sem Stock suficiente. Um Cart esquecido por 24 horas, ou abandonado explicitamente, vira Abandonado, e o Shopper começa um novo Cart na próxima compra. Cada Shopper (identificado anonimamente pelo navegador) usa cada Coupon em no máximo um Order.

## User Stories

### Identidade e ciclo de vida do Cart

1. Como Shopper, quero que meu navegador me reconheça sem cadastro, para que eu possa comprar sem criar conta.
2. Como Shopper, quero que meu Cart seja criado só quando eu adicionar o primeiro Product, para que abrir a loja não crie Carts vazios.
3. Como Shopper, quero que meu Cart continue lá quando eu recarregar a página, para que eu não perca o que escolhi.
4. Como Shopper, quero ver em que estado meu Cart está (Vazio, Com Itens, Em Checkout, Pedido Criado, Abandonado), para que eu saiba o que posso fazer com ele.
5. Como Shopper, quero que meu Cart volte a Vazio quando eu remover o último item, para que ele reflita o que de fato contém.
6. Como Shopper, quero começar um Cart novo depois de concluir um Order, para que a próxima compra não misture itens da anterior.
7. Como Shopper, quero que meu navegador continue me reconhecendo depois de um Order, para que a regra de uso único de Coupon valha entre compras.
8. Como Shopper, quero que um Cart que não existe mais (Pedido Criado, Abandonado ou desconhecido) seja esquecido pelo navegador, para que a próxima adição crie um Cart novo sem erro.

### Itens do Cart

9. Como Shopper, quero adicionar um Product do catálogo ao Cart informando a quantidade, para que eu possa comprá-lo.
10. Como Shopper, quero que adicionar de novo um Product que já está no Cart some a quantidade ao item existente, para que eu não tenha o mesmo Product em duas linhas.
11. Como Shopper, quero alterar a quantidade de um Cart Item, para que eu compre quantas unidades quiser.
12. Como Shopper, quero remover um Cart Item, para que eu desista de um Product sem afetar os outros.
13. Como Shopper, quero ser impedido de pedir mais unidades do que o Stock atual, para que eu não monte um Cart impossível de confirmar.
14. Como Shopper, quero ser impedido de usar quantidade zero, negativa, fracionária ou acima de 99, para que o Cart só aceite quantidades válidas.
15. Como Shopper, quero que o preço unitário de cada Cart Item fique fixo a partir do momento em que o adicionei, para que o valor não mude enquanto eu decido.
16. Como Shopper, quero ver nome, preço unitário, quantidade e o subtotal de cada Cart Item, para que eu entenda o que estou comprando.
17. Como Shopper, quero ver o Subtotal, o Discount e o Total do Cart calculados pelo servidor, para que os valores exibidos sejam os mesmos do Order.
18. Como Shopper, quero uma mensagem clara quando tentar adicionar um Product inexistente, para que eu saiba que a operação falhou.
19. Como Shopper, quero que a interface valide a quantidade antes de enviar (entre 1 e 99 e até o Stock exibido), para que eu receba o aviso sem esperar o servidor.

### Coupon

20. Como Shopper, quero aplicar um Coupon pelo código, para que eu ganhe o desconto.
21. Como Shopper, quero que o código do Coupon seja aceito em maiúsculas ou minúsculas, para que eu não erre por causa da digitação.
22. Como Shopper, quero aplicar o Coupon com o Cart Com Itens ou Em Checkout, para que eu possa lembrar dele na revisão.
23. Como Shopper, quero ser impedido de aplicar Coupon num Cart Vazio, para que não exista desconto sobre nada.
24. Como Shopper, quero que aplicar um segundo Coupon substitua o primeiro, para que fique claro que Coupons não acumulam.
25. Como Shopper, quero remover o Coupon aplicado, para que eu desista dele.
26. Como Shopper, quero ser avisado quando o código não existe, para que eu corrija a digitação.
27. Como Shopper, quero ser avisado quando o Coupon está expirado, para que eu não conte com o desconto.
28. Como Shopper, quero ser avisado quando já usei esse Coupon em outro Order, para que eu entenda por que ele foi recusado.
29. Como Shopper, quero que um Coupon percentual desconte a porcentagem do Subtotal arredondada para baixo no centavo, para que o valor seja previsível.
30. Como Shopper, quero que um Coupon de valor fixo nunca deixe o Total negativo, para que eu nunca veja um Total abaixo de zero.
31. Como dono da loja, quero que cada Shopper use um mesmo Coupon em no máximo um Order, para que o desconto não seja reaproveitado indefinidamente pela mesma pessoa.
32. Como dono da loja, quero que a validade do Coupon seja conferida de novo na confirmação, para que um Coupon que expirou durante o checkout não gere desconto.
33. Como dono da loja, quero que dois Orders simultâneos do mesmo Shopper com o mesmo Coupon não passem os dois, para que a regra de uso único não tenha brecha de concorrência.

### Checkout e confirmação

34. Como Shopper, quero iniciar o checkout a partir de um Cart Com Itens, para que eu revise a compra antes de confirmar.
35. Como Shopper, quero que os itens fiquem travados durante o checkout, para que eu confirme exatamente o que revisei.
36. Como Shopper, quero voltar a editar o Cart a partir do checkout, para que eu corrija algo antes de confirmar.
37. Como Shopper, quero ser impedido de iniciar o checkout com o Cart Vazio, para que não exista Order sem itens.
38. Como Shopper, quero confirmar o Order a partir do checkout, para que a compra seja registrada.
39. Como Shopper, quero que a confirmação crie o Order com os mesmos itens, preços, Subtotal, Discount e Total que eu revisei, para que não haja surpresa.
40. Como Shopper, quero que, se faltar Stock na confirmação, nenhum Order seja criado e o Cart continue Em Checkout, para que eu possa ajustar e tentar de novo.
41. Como Shopper, quero ver quais Products estão sem Stock suficiente e quantas unidades restam de cada um, para que eu saiba o que ajustar.
42. Como Shopper, quero que, se o Coupon expirou ou já foi usado, a confirmação falhe sem criar Order e o Cart continue Em Checkout, para que eu possa remover o Coupon e confirmar.
43. Como Shopper, quero ver uma página de confirmação com o Order criado (itens, Subtotal, Discount, Total e Coupon), para que eu tenha certeza de que a compra deu certo.
44. Como dono da loja, quero que o Stock seja decrementado na mesma transação que cria o Order, para que nunca exista Order sem baixa de Stock ou baixa sem Order.
45. Como dono da loja, quero que dois Shoppers disputando a última unidade nunca comprem os dois, para que o Stock nunca fique negativo nem eu venda o que não tenho.
46. Como dono da loja, quero que o Order guarde uma cópia do Coupon (código, tipo e valor), para que alterações posteriores no Coupon não mudem Orders passados.
47. Como dono da loja, quero que o Order nasça no status Criado, para que o ciclo de vida do Order possa ser implementado depois a partir daí.

### Abandono

48. Como Shopper, quero abandonar explicitamente meu Cart, para que eu desista da compra.
49. Como dono da loja, quero que um Cart Com Itens ou Em Checkout sem nenhuma alteração por 24 horas seja considerado Abandonado, para que Carts esquecidos não fiquem abertos para sempre.
50. Como Shopper, quero que apenas olhar o Cart não conte como atividade, para que a regra de 24 horas seja sobre mudanças reais.
51. Como Shopper, quero ser avisado de que meu Cart expirou quando voltar depois de 24 horas, para que eu entenda por que ele sumiu.
52. Como Shopper, quero que um Cart Vazio nunca seja marcado como Abandonado, para que não haja abandono sem nada a perder.
53. Como Shopper, quero ser impedido de alterar um Cart Pedido Criado ou Abandonado, para que estados finais sejam de fato finais.

### Erros e contrato

54. Como desenvolvedor do frontend, quero que todo erro venha no envelope padrão com um código estável, para que a interface trate cada caso sem interpretar texto.
55. Como desenvolvedor do frontend, quero que toda operação no Cart devolva o Cart completo atualizado, para que a tela seja redesenhada a partir de uma única resposta.
56. Como desenvolvedor, quero que cada transição do diagrama de estados corresponda a uma rota e um método de Service, para que o código, o diagrama e a engenharia reversa (Passo 10) fiquem alinhados.
57. Como avaliador do curso, quero que o fluxo completo do Cart seja coberto por testes de integração e E2E executados por `make test`, para que eu verifique o comportamento sem passos manuais.

## Implementation Decisions

### Escopo e módulos

- A feature cobre o Cart até a criação do Order no status Criado. Transições do Order depois disso ficam fora.
- Backend: dois módulos novos por feature, cada um com Controller, Service e Repository, seguindo o padrão de `products`:
  - **carts**: Cart, Cart Items, Coupon aplicado, transições de estado e a confirmação;
  - **orders**: leitura de um Order por id.
  - A confirmação é um método do Service de carts, porque é uma transição do Cart (Em Checkout → Pedido Criado). Ela usa o acesso a Orders e a Products dentro da mesma transação.
- Coupons não têm API própria: são lidos pelo Repository de carts (ou um Repository de coupons usado por ele) e criados apenas por seed (Passo 7) ou pelos testes.
- Pacote shared: contratos TypeBox novos para Cart, Cart Item, Coupon aplicado, Order, Order Item e para o corpo de cada rota.
- Frontend: módulos de API para carts e orders; funções de Domain do Cart; páginas novas de Cart (que também mostra o checkout) e de confirmação do Order; botão de adicionar no card do Product.

### Identidade do Shopper

- O frontend gera um **Shopper id** (UUID v4 a partir de `crypto.getRandomValues()`, porque `crypto.randomUUID()` só existe em contexto seguro) uma única vez e o guarda no `localStorage`. Ele é enviado somente na criação do Cart. O Cart e o Order o registram.
- Não existe tabela de Shoppers. O Shopper id não é chave primária de nada, por isso a geração pelo navegador não contradiz a ADR 0006.
- O frontend também guarda o **Cart id** atual no `localStorage`. Ele é descartado quando o Cart fica Pedido Criado ou Abandonado, ou quando a API responde `CART_NOT_FOUND`. O Shopper id nunca é descartado.
- Quem conhece o Cart id pode ler e alterar o Cart. Isso é aceito por não haver autenticação (fora do escopo do sistema) e fica registrado para o Passo 9.

### Máquina de estados do Cart

- O status é persistido com os cinco valores do diagrama do curso: `empty`, `with_items`, `checkout`, `order_created`, `abandoned`. `order_created` e `abandoned` são finais.
- Transições permitidas (cada uma com sua rota e seu método de Service):

  | De | Ação | Para |
  | --- | --- | --- |
  | `empty` | adicionar item | `with_items` |
  | `with_items` | adicionar item, alterar quantidade, remover item que não é o último | `with_items` |
  | `with_items` | remover o último item | `empty` |
  | `with_items` | iniciar checkout | `checkout` |
  | `checkout` | voltar a editar | `with_items` |
  | `checkout` | confirmar | `order_created` |
  | `with_items`, `checkout` | abandonar (explícito) ou 24 h sem alteração | `abandoned` |

- Aplicar ou remover Coupon é permitido em `with_items` e `checkout` e não muda o status.
- Qualquer outra combinação de estado e ação é rejeitada com `INVALID_CART_TRANSITION` (ex.: alterar itens em `checkout`, qualquer ação num Cart final, abandonar um Cart `empty`, confirmar fora de `checkout`). Aplicar Coupon ou iniciar checkout com o Cart `empty` é rejeitado com `CART_EMPTY`.
- O texto do curso diz "qualquer estado → Abandonado", mas o diagrama mermaid só desenha a transição a partir de Com Itens e Em Checkout. Vale o diagrama: um Cart Vazio não tem o que perder.
- O Service centraliza a tabela de transições, que é o artefato do Diagram Prompting do Passo 4.

### Abandono por tempo

- O Cart guarda o instante da última alteração. Toda mutação bem-sucedida o atualiza (itens, Coupon, transições). A leitura (`GET`) não.
- O tempo vem de um **relógio injetado** (`now(): Date`), nova dependência da função de montagem da aplicação ao lado do banco e da configuração. O ponto de entrada usa o relógio do sistema; os testes passam um relógio controlável.
- Não há job agendado. Em toda requisição sobre um Cart `with_items` ou `checkout` cuja última alteração tem 24 horas ou mais, o Service primeiro o move para `abandoned` (persistindo) e depois trata a requisição. Assim um `GET` devolve o Cart já Abandonado com `200`, e uma mutação é rejeitada com `INVALID_CART_TRANSITION`.

### Cart Items

- No máximo um Cart Item por Product em cada Cart (restrição única no banco sobre Cart e Product). Adicionar um Product que já está no Cart soma a quantidade.
- Quantidade: inteiro de 1 a 99, validado pelo schema da rota (`400 VALIDATION_ERROR`). Se a soma com um item existente passar de 99, o Service rejeita com `QUANTITY_LIMIT_EXCEEDED`. Alterar para zero é rejeitado; remover tem rota própria.
- Stock: ao adicionar ou alterar, a quantidade resultante é comparada ao Stock atual do Product. Se exceder, a resposta é `INSUFFICIENT_STOCK`. Nada é reservado: o Stock só muda na confirmação.
- Preço unitário: cópia do preço do Product no momento em que o Product entra no Cart. Somar quantidade a um item existente mantém o preço original.
- Remover o último item leva o Cart a `empty` e também remove o Coupon aplicado, para que um Cart Vazio nunca carregue Coupon (coerente com a proibição de aplicar Coupon em Cart Vazio).

### Regras do Coupon

- Campos: código (único, guardado em maiúsculas), tipo (`percentage` ou `fixed`), valor e instante de expiração (`timestamptz`).
  - `percentage`: valor inteiro de 1 a 100.
  - `fixed`: valor em centavos, maior que zero.
- Válido quando o código existe (comparação sem diferenciar maiúsculas de minúsculas) e `agora < expiração`, segundo o relógio injetado.
- Um Coupon por Cart. Aplicar outro substitui. Remover quando não há Coupon é uma operação sem efeito que devolve o Cart.
- Uso único por Shopper: ao aplicar, o Service verifica se o Shopper do Cart já tem um Order com esse Coupon (`COUPON_ALREADY_USED`). Na confirmação, a garantia de verdade é um **índice único parcial** na tabela de Orders sobre Shopper id e código do Coupon, quando há Coupon. Se o índice rejeitar o insert, o Service traduz a violação em `COUPON_ALREADY_USED` e toda a transação é desfeita, incluindo o Stock.
- Sem limite global de usos, sem valor mínimo de Subtotal e sem acúmulo.

### Cálculo do dinheiro (ADR 0005)

- Subtotal = soma de quantidade × preço unitário dos itens.
- Discount:
  - `percentage`: `floor(Subtotal × valor / 100)`;
  - `fixed`: `min(valor, Subtotal)`;
  - sem Coupon: 0.
- Total = Subtotal − Discount, nunca negativo.
- Tudo é calculado no backend e devolvido em centavos inteiros. O frontend só formata.

### Confirmação (ADR 0009)

- Só a partir de `checkout`. Tudo acontece numa única transação:
  1. revalida o Coupon (existência, expiração, uso único) e, se falhar, responde com o erro correspondente sem alterar nada;
  2. decrementa o Stock de cada item, **em ordem crescente de product id**, com `UPDATE … SET stock = stock - qtd WHERE id = … AND stock >= qtd`. O Repository informa quais itens não foram decrementados; o Service transforma isso em `INSUFFICIENT_STOCK` e desfaz a transação;
  3. cria o Order e os Order Items;
  4. move o Cart para `order_created`.
- Em qualquer falha, nenhum Order é criado, o Stock fica intacto e o Cart continua `checkout`.
- `INSUFFICIENT_STOCK` na confirmação lista **todos** os Products em falta, não só o primeiro. Para isso o Service verifica todos os itens antes de desfazer a transação.

### Order

- Campos: id, Shopper id, Cart de origem, status (`created`), Subtotal, Discount e Total em centavos, cópia do Coupon (código, tipo e valor, ou nulo) e instante de criação (do relógio injetado).
- Order Items: Product, quantidade e preço unitário copiados dos Cart Items.
- Não há listagem de Orders nem transições de status.

### Banco de dados

- Tabelas novas (migrations geradas pelo `drizzle-kit`): `carts`, `cart_items`, `coupons`, `orders`, `order_items`, todas com UUID gerado pelo banco (ADR 0006).
- Constraints de check:
  - quantidades entre 1 e 99;
  - preços e valores monetários maiores ou iguais a zero;
  - valor do Coupon coerente com o tipo;
  - status do Cart e do Order restritos aos valores conhecidos.
- Unicidade:
  - (Cart, Product) em `cart_items`;
  - código em `coupons`;
  - índice único parcial (Shopper id, código do Coupon) em `orders`, onde o código não é nulo.
- O Cart referencia o Coupon aplicado. O Order guarda a cópia do Coupon em colunas próprias, sem depender da linha do Coupon.

### Contrato da API

Todas as rotas ficam sob `/api`. Toda rota de Cart devolve o Cart completo; `confirm` devolve o Order.

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `POST /api/carts` | `{ shopperId }` | `201` Cart (`empty`) |
| `GET /api/carts/:id` | | `200` Cart |
| `POST /api/carts/:id/items` | `{ productId, quantity }` | `200` Cart |
| `PATCH /api/carts/:id/items/:productId` | `{ quantity }` | `200` Cart |
| `DELETE /api/carts/:id/items/:productId` | | `200` Cart |
| `PUT /api/carts/:id/coupon` | `{ code }` | `200` Cart |
| `DELETE /api/carts/:id/coupon` | | `200` Cart |
| `POST /api/carts/:id/checkout` | | `200` Cart (`checkout`) |
| `POST /api/carts/:id/edit` | | `200` Cart (`with_items`) |
| `POST /api/carts/:id/abandon` | | `200` Cart (`abandoned`) |
| `POST /api/carts/:id/confirm` | | `201` Order |
| `GET /api/orders/:id` | | `200` Order |

- Cart: `{ id, status, items: [{ productId, name, unitPriceCents, quantity, lineTotalCents }], coupon: { code, type, value } | null, subtotalCents, discountCents, totalCents }`. O nome vem do Product atual. Os itens saem ordenados pelo momento em que entraram no Cart.
- Order: `{ id, status, items: [{ productId, name, unitPriceCents, quantity, lineTotalCents }], coupon: { code, type, value } | null, subtotalCents, discountCents, totalCents, createdAt }`.
- Ids no caminho e no corpo são validados como UUID pelo schema (`400`).

### Erros de domínio

- O backend ganha um erro de domínio (código, mensagem em português e `details` opcional) que o Service lança e o tratador de erros converte para o envelope padrão. O Service não conhece HTTP: ele escolhe o código, e o mapeamento código → status fica na camada HTTP.

| Código | HTTP | Quando |
| --- | --- | --- |
| `CART_NOT_FOUND` | 404 | Cart do caminho não existe |
| `CART_ITEM_NOT_FOUND` | 404 | alterar ou remover um Product que não está no Cart |
| `PRODUCT_NOT_FOUND` | 404 | Product do corpo não existe |
| `ORDER_NOT_FOUND` | 404 | Order do caminho não existe |
| `INVALID_CART_TRANSITION` | 409 | ação não permitida no status atual; `details: { status }` |
| `CART_EMPTY` | 409 | aplicar Coupon ou iniciar checkout com o Cart `empty` |
| `INSUFFICIENT_STOCK` | 409 | adicionar, alterar ou confirmar acima do Stock; `details: [{ productId, requested, available }]` |
| `COUPON_ALREADY_USED` | 409 | o Shopper já tem um Order com esse Coupon |
| `QUANTITY_LIMIT_EXCEEDED` | 422 | a soma com um item existente passaria de 99 |
| `COUPON_NOT_FOUND` | 422 | código não existe |
| `COUPON_EXPIRED` | 422 | expirado ao aplicar ou ao confirmar |

### Frontend

- Navegação por hash, sem biblioteca de roteamento (ADR 0003):
  - `#/` é o catálogo;
  - `#/carrinho` é o Cart, incluindo a visão de checkout;
  - `#/pedido/:id` é a confirmação do Order.
- Catálogo: cada card de Product ganha um campo de quantidade e o botão "Adicionar ao carrinho", desabilitado quando o Product está Esgotado. Um link para o Cart fica sempre visível.
- Cart, conforme o status:
  - `with_items`: itens com quantidade editável e botão de remover, campo de Coupon (aplicar e remover), Subtotal, Discount, Total, "Finalizar compra" e "Abandonar carrinho";
  - `checkout`: itens somente leitura, Coupon ainda editável, "Voltar para editar" e "Confirmar pedido";
  - `empty` ou sem Cart: mensagem de Cart vazio com link para o catálogo.
- Confirmação: itens, Subtotal, Discount, Total e Coupon do Order, mais um link para continuar comprando.
- Domain (funções puras):
  - validação de quantidade (inteiro de 1 a 99 e até o Stock exibido);
  - quais ações cada status permite (decide quais botões aparecem);
  - rótulos em português de cada status;
  - mensagem em português para cada código de erro de domínio.
- API: um módulo para carts e um para orders, tipados com os contratos do shared. Eles leem e escrevem o Shopper id e o Cart id no `localStorage` por meio de um único ponto, com `try/catch`.
- Quando o Cart guardado está Abandonado, Pedido Criado ou não existe, o frontend descarta o Cart id. Se estava Abandonado, mostra "Seu carrinho expirou". A próxima adição cria um Cart novo.
- Depois de confirmar, o frontend descarta o Cart id e navega para `#/pedido/:id`.

## Testing Decisions

### O que é um bom teste aqui

- Testa comportamento observável por uma interface pública, nunca detalhes de implementação. Um teste não deve quebrar quando a estrutura interna muda e o comportamento não.
- Os valores esperados vêm de uma fonte independente (literais conhecidos, exemplos desta spec), nunca recalculados do jeito que o código calcula. Ex.: Subtotal de 3 × R$ 33,33 = 9999 com 10% → Discount 999, Total 9000.
- Nenhum mock de colaboradores internos. O banco é real (o database de teste).

### Seams acordadas (só se testa nelas)

1. **App HTTP do backend (integração)**: a função de montagem da aplicação com `inject()` do Fastify contra o PostgreSQL real no `ecommerce_test`, agora recebendo também o relógio injetado. Cobre:
   - cada rota do contrato, com o formato completo da resposta;
   - cada transição permitida da tabela e uma amostra representativa das proibidas (edição em `checkout`, ações em Carts finais, abandono de Cart `empty`, confirmação fora de `checkout`);
   - Cart Items: soma de quantidade com o mesmo Product, limites 1 e 99 (inclusive a soma acima de 99), Stock excedido ao adicionar e ao alterar, preço unitário fixo após mudar o preço do Product, remover o último item leva a `empty` e remove o Coupon;
   - Coupon: aplicar, substituir e remover; código sem diferenciar maiúsculas; inexistente; expirado ao aplicar; expirado entre aplicar e confirmar (avançando o relógio); já usado pelo mesmo Shopper ao aplicar e ao confirmar; outro Shopper pode usar o mesmo Coupon;
   - aritmética: percentual com arredondamento para baixo, fixo maior que o Subtotal resultando em Total 0, sem Coupon;
   - confirmação: Order criado com cópias corretas, Stock decrementado, Cart `order_created`; falha por Stock é tudo ou nada (sem Order, Stock intacto, Cart `checkout`, `details` com todos os Products em falta);
   - abandono por tempo: com 23h59 de inatividade o Cart continua aberto; com 24h o `GET` devolve `abandoned`; um `GET` não reinicia a contagem; um Cart `empty` nunca é abandonado;
   - **concorrência**: duas confirmações simultâneas (`Promise.all` de dois `inject()`) disputando a última unidade, onde exatamente uma cria Order e o Stock termina em 0; dois Carts do mesmo Shopper confirmando simultaneamente com o mesmo Coupon, onde exatamente um cria Order;
   - cada código de erro da tabela, no envelope padrão;
   - `GET /api/orders/:id` existente e inexistente.
2. **Navegador contra a stack do compose (E2E)**: Playwright via nginx na porta `8080`, com dados (Products e Coupons) inseridos pelo próprio teste, como no suporte de banco do E2E do catálogo. Cada teste usa um contexto de navegador novo, ou seja, um Shopper novo. Cobre:
   - caminho feliz: adicionar do catálogo → alterar quantidade → remover → aplicar Coupon → finalizar compra → voltar para editar → finalizar → confirmar → página de confirmação com os valores certos;
   - recarregar a página mantém o Cart;
   - abandono explícito;
   - erro de Stock exibido ao confirmar quando o Stock foi reduzido por fora;
   - erro de Coupon inválido exibido.

   O abandono por 24 horas **não** é testado aqui, porque o relógio da stack não é controlável; a seam 1 cobre.
3. **Domain do frontend (unidade)**: funções puras com Vitest. Cobre:
   - validação de quantidade (0, 1, 99, 100, fracionário, acima do Stock exibido);
   - ações permitidas por status;
   - rótulos de status;
   - mensagem por código de erro.

### Deliberadamente sem seam própria

- Service, tabela de transições e cálculo de desconto do backend isolados: a seam 1 os alcança pela API pública. Testá-los diretamente acoplaria os testes à estrutura interna.
- Os Web Components: cobertos pela seam 2.

### Prior art

- Integração: os testes de products, errors e health do backend (montagem + `inject()` + database de teste limpo a cada teste).
- E2E: o teste do catálogo e o suporte de banco do E2E, que hoje dá `TRUNCATE products CASCADE` e passará a cobrir também Carts, Orders e Coupons.
- Unidade: os testes de money e stock do Domain do frontend.

## Out of Scope

- Ciclo de vida do Order depois de Criado (Confirmado, Enviado, Entregue, Cancelado), listagem de Orders e devolução de Stock em cancelamento.
- Criação e edição de Coupons por API ou interface; os Coupons vêm do seed (Passo 7) ou dos testes.
- Limite global de usos de um Coupon, valor mínimo de Subtotal, Coupons acumuláveis e Coupons restritos a Products.
- Reserva de Stock ao adicionar ao Cart.
- Job agendado de abandono: o abandono por tempo é avaliado sob demanda.
- Recuperar ou reabrir um Cart Abandonado.
- Atualizar o preço dos Cart Items quando o preço do Product muda.
- Autenticação, contas de usuário e proteção do Cart contra quem conhece seu id (fora do escopo do sistema; registrado para o Passo 9).
- Pagamento, frete, endereço e notificações.
- CSS e UX além do mínimo funcional.

## Further Notes

- Este documento é o entregável `docs/carrinho/frd-carrinho.md` do Passo 2 do curso. O blueprint (`docs/carrinho/blueprint-carrinho.md`) e os tickets (`docs/carrinho/issues/`) vêm a seguir, via `/to-tickets`.
- Por decisão do desenvolvedor, a feature é desenvolvida direto no `main`, com commits granulares como pontos de recuperação, sem worktree nem branch de feature.
- Lacunas propositais do curso, fechadas aqui:
  - **Regras de desconto**: percentual arredondado para baixo, fixo limitado ao Subtotal, sem acúmulo, uso único por Shopper.
  - **Estoque**: verificado sem reserva ao editar, decrementado na confirmação por update condicional, tudo ou nada (ADR 0009).
  - **Validação**: schema TypeBox na borda (tipos, UUIDs, faixas), regras de negócio no Service e constraints no banco como última linha.
- Três decisões tomadas ao redigir esta spec, além das combinadas no brainstorming:
  - remover o último item também remove o Coupon;
  - `CART_ITEM_NOT_FOUND` para alterar ou remover um Product que não está no Cart;
  - `QUANTITY_LIMIT_EXCEEDED` quando adicionar de novo um Product levaria a quantidade acima de 99.
- O Passo 9 (red team) deve olhar em especial: acesso a Cart pelo id sem autenticação, Shopper id forjado para burlar o uso único de Coupon e as corridas de Stock e de Coupon.
