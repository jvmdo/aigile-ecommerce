# Relatório de seeds

Passo 7 do projeto (dados sintéticos). Ticket: [docs/seeds/issues/01-seed.md](seeds/issues/01-seed.md).

## Como gerar

```sh
make seed
```

O comando roda o serviço `seed` do compose, um container de execução única que sobe depois do `migrate`. Ele **apaga** todos os Products, Coupons, Carts e Orders do banco da aplicação (`ecommerce`) e recria tudo. Funciona com `make up` ou `make dev` de pé e se recusa a rodar no `ecommerce_test`. Nenhum teste depende desses dados: os testes de integração e E2E criam os próprios dados em bancos separados.

A semente do faker é fixa e as datas são relativas ao instante da execução, então cada `make seed` recria o mesmo estado, deslocado para "agora". As contagens abaixo se repetiram em execuções seguidas. Cada execução leva cerca de **10 s** (entre 9,4 s e 10,8 s nas execuções medidas).

## Como os dados são gerados

- **Biblioteca:** [`@faker-js/faker`](https://fakerjs.dev) ~9.9 com locale `pt_BR`, como devDependency do backend e registrado na ADR 0008. É a biblioteca padrão de dados fake do ecossistema TypeScript. As rotinas do faker para nomes de produto em pt_BR geram combinações sem sentido ("Incrível Macio Atum") e descrições em inglês. Por isso, nomes e descrições saem de listas em português por categoria (Cozinha, Casa, Moda, Eletrônicos, Esporte, Papelaria, Mercearia), e o faker cuida dos sorteios, números, datas e UUIDs.
- **Products e Coupons** são inseridos direto no banco, porque não têm API de criação.
- **Carts e Orders passam pelo Service de carts real**, com um relógio controlável posicionado no instante de cada passo: criar, adicionar, alterar e remover itens, aplicar e remover Coupon, checkout, voltar a editar, abandonar e confirmar. Assim cada Cart e Order segue as regras de domínio (Stock, uso único de Coupon, expiração, abandono, cálculo de Discount e Total). Qualquer recusa do Service durante o seed interrompe a execução como bug.
- O plano de cada Cart é montado antes da execução, com um controle próprio de Stock. Assim, oito Shoppers podem rodar em paralelo sem que um encontre falta de Stock que o plano não previu.
- Duas mudanças simulam ações que o sistema não tem e são gravadas direto no banco, depois dos Carts: o aumento de preço de alguns Products (para que Cart Items fiquem com o preço antigo) e a redução do Stock de um Product (como se outra venda tivesse levado as unidades).
- **Sem nome nem endereço de pessoa:** o Shopper é anônimo por decisão de domínio (veja `GLOSSARY.md`), e o schema não foi alterado para o seed. O realismo está nos Products, nos Coupons e na linha do tempo de Carts e Orders, que vai de 24/08 a 17/11/2026.

## O que foi gerado

| Entidade | Quantidade |
| --- | --- |
| Products | 300 |
| Coupons | 40 (25 percentuais, 15 fixos) |
| Shoppers | 1.009 (1.000 gerados e 9 de demonstração); 391 têm mais de um Cart |
| Carts | 1.506 |
| Cart Items | 3.034 |
| Orders | 732 (225 com Coupon, 507 sem) |
| Order Items | 1.597 |

Carts por status gravado no banco:

| Status | Carts | Detalhe |
| --- | --- | --- |
| `order_created` | 732 | Um Order por Cart |
| `abandoned` | 233 | Abandonados explicitamente ou por 24 h (o Shopper voltou depois de 24 h e o Cart foi consultado) |
| `with_items` | 251 | 125 alterados nas últimas 24 h; 126 parados há mais de 24 h |
| `checkout` | 146 | 85 alterados nas últimas 24 h; 61 parados há mais de 24 h |
| `empty` | 144 | Parte deles já teve um item que foi removido |

Os 187 Carts `with_items` e `checkout` parados há mais de 24 h continuam gravados assim de propósito. O abandono por tempo é avaliado sob demanda (FRD do carrinho, "Abandono por tempo"): o primeiro acesso a cada um deles grava `abandoned`.

Os Orders estão entre 24/08 e 17/11/2026. O Total varia de R$ 0,00 a R$ 8.999,70, com média de R$ 1.469,80. 37 dos 40 Coupons aparecem em algum Order, e 20 Orders usaram Coupons que expiraram depois da compra. 128 Carts abertos estão com Coupon aplicado.

## Valores limite e variações

| Caso | Onde está |
| --- | --- |
| Stock 0 ("Esgotado") | 24 Products: "Luminária Pendente de Cobre", "Kit de Pincéis para Aquarela" e os gerados com Stock zero |
| Stock 1 (última unidade) | 4 Products, entre eles "Vaso de Cerâmica Assinado" e "Relógio de Bolso Vintage" |
| Stock alto | 12 Products com 1.000 unidades ou mais; "Clipe de Papel Niquelado" tem 5.000 |
| Preço mínimo | "Clipe de Papel Niquelado", R$ 0,01 |
| Preço alto | "Piano Digital de 88 Teclas", R$ 12.999,90 |
| Descrição vazia | 45 Products (campo opcional vazio; os outros 255 têm descrição) |
| Coupon de 1% | `DESCONTINHO1` |
| Coupon de 100% | `CORTESIA100` (Total zero) |
| Coupon fixo maior que o Subtotal | `VALE500` (R$ 500,00): o Discount para no Subtotal; 2 Orders têm Total zero por ele (e 1 por outro Coupon fixo) |
| Coupons expirados | 8, entre eles `PRIMAVERA15`, `INVERNO20` e `FLASH25` |
| Coupons que vencem em poucas horas | `RELAMPAGO20` (4 h depois do seed) e `ULTIMAHORA10` (9 h depois) |
| Quantidade máxima (99) | Cart do Shopper de demonstração "Com Itens" |
| Preço unitário defasado | 38 Cart Items em Carts abertos com preço diferente do preço atual do Product |
| Order com e sem Coupon | 225 com (campos `coupon_*` preenchidos) e 507 sem (os três nulos) |

## Shoppers de demonstração

Os Carts gerados pertencem a Shoppers fictícios, e o navegador só mostra o Cart cujo id está no `localStorage`. Para ver um caso, abra o frontend (<http://localhost:8080> com `make up`, ou <http://localhost:5173> com `make dev`), abra o console do navegador e cole o trecho com os ids do cenário:

```js
localStorage.setItem("aigile.shopperId", "SHOPPER_ID");
localStorage.setItem("aigile.cartId", "CART_ID");
location.hash = "#/carrinho";
location.reload();
```

| Cenário | Shopper id | Cart id | O que acontece |
| --- | --- | --- | --- |
| Com Itens: quantidade 99 e preço defasado | `5eed0000-0000-4000-8000-000000000001` | `5eedca27-0000-4000-8000-000000000001` | 99 clipes a R$ 0,01 e um item com o preço antigo |
| Em Checkout com Coupon expirado | `5eed0000-0000-4000-8000-000000000002` | `5eedca27-0000-4000-8000-000000000002` | "Confirmar pedido" mostra "Este cupom expirou." (`FLASH25` venceu 1 h antes do seed) |
| Em Checkout com Stock insuficiente | `5eed0000-0000-4000-8000-000000000003` | `5eedca27-0000-4000-8000-000000000003` | Pede 3 "Relógio de Bolso Vintage"; resta 1; a confirmação é recusada |
| Coupon já usado | `5eed0000-0000-4000-8000-000000000004` | `5eedca27-0000-4000-8000-000000000004` | Já tem um Order com `BEMVINDO10`; aplicá-lo de novo é recusado |
| Parado há 3 dias | `5eed0000-0000-4000-8000-000000000005` | `5eedca27-0000-4000-8000-000000000005` | Ao abrir: "Seu carrinho expirou." |
| Coupon de 100% | `5eed0000-0000-4000-8000-000000000006` | `5eedca27-0000-4000-8000-000000000006` | Em Checkout com `CORTESIA100`, Total R$ 0,00; a confirmação cria o Order |
| Coupon fixo maior que o Subtotal | `5eed0000-0000-4000-8000-000000000007` | `5eedca27-0000-4000-8000-000000000007` | `VALE500` num Cart de até R$ 200,00: Total R$ 0,00 |
| Vazio | `5eed0000-0000-4000-8000-000000000008` | `5eedca27-0000-4000-8000-000000000008` | "Seu carrinho está vazio." |
| Abandonado | `5eed0000-0000-4000-8000-000000000009` | `5eedca27-0000-4000-8000-000000000009` | Ao abrir: "Seu carrinho expirou." |

Os Carts de demonstração abertos foram alterados entre 30 min e 3 h antes do seed. **Depois de 24 h eles passam a Abandonado** ao serem abertos, e o Coupon `RELAMPAGO20` vence 4 h após o seed. Para demonstrar, rode `make seed` pouco antes. Cada cenário que confirma ou abandona um Cart muda o estado; um novo `make seed` restaura tudo.

## O sistema continua funcional

Verificação de fumaça feita em 17/11/2026 com os dados carregados, contra o backend e o frontend do `make dev`:

- `GET /health` → `200` em 3 a 43 ms.
- `GET /api/products` → `200` com os 300 Products, 61.348 bytes, em 4 a 16 ms (chamadas diretas e pelo proxy do Vite).
- No navegador (Chromium headless), o catálogo renderizou os 300 cards em 185 a 230 ms.
- Compra completa com um Shopper novo pelo navegador: adicionar ao Cart, "Finalizar compra" e "Confirmar pedido" levaram à página `#/pedido/:id` com "Pedido confirmado".
- Shoppers de demonstração pelo navegador: "Com Itens" mostrou 99 × R$ 0,01 e o item de preço defasado; "Coupon expirado" mostrou "Este cupom expirou." ao confirmar; "Parado há 3 dias" mostrou "Seu carrinho expirou.".
- O teste de integração `backend/test/integration/seed.test.ts` roda o seed com volume reduzido no `ecommerce_test` e verifica pela API cada Shopper de demonstração, os cinco status, os casos de borda do catálogo e que uma segunda execução recria o mesmo estado. Toda a suíte de integração passou (127 testes).

Depois da verificação, um novo `make seed` restaurou o estado descrito acima.

## Achados

1. **Catálogo sem paginação.** Os 300 Products vêm numa única resposta e numa única página de 32.726 px de altura. A resposta (61 KB, menos de 20 ms) e a renderização (até ~230 ms) ainda são rápidas, mas encontrar um Product exige rolar dezenas de telas. Paginação, filtros e busca estão fora do escopo desde o spec do scaffolding. Fica registrado como o primeiro limite que o volume expôs.
2. **O banco aceita preço zero.** A constraint de `products` é `price_cents >= 0`, mas nem o glossário nem o FRD falam em Product grátis. O seed não gera nenhum (o mínimo é R$ 0,01). Vale decidir se a constraint deveria ser `> 0`.
3. **Teto dos valores em centavos.** Subtotal, Discount e Total de um Order são `integer` (até R$ 21.474.836,47), e nada limita o preço máximo de um Product. Com o catálogo atual o teto não é atingido: o maior Order tem R$ 8.999,70, e o seed só põe Products acima de R$ 1.000,00 em quantidade 1. Um Product de mais de R$ 216.917,54 com quantidade 99 estouraria a coluna na confirmação.
4. **Nenhuma recusa inesperada do Service.** Cerca de 1.500 Carts e milhares de operações, com oito Shoppers em paralelo, rodaram sem nenhum erro de regra que o plano não esperasse.
5. **Nomes gerados por combinação.** Nome, qualificador e detalhe são sorteados dentro da categoria, então de vez em quando aparece uma combinação improvável, como "Relógio de Parede de Tricô".

## Diferenças em relação ao enunciado

- O enunciado sugere a skill `/synthetic-data` numa sessão limpa no `clone-base`. Essa skill não está instalada. O plano saiu de uma sessão de `/grill-with-docs`, registrado no ticket, e o trabalho foi feito na `main`, como no resto do projeto.
- O enunciado cita nomes e endereços como exemplo de dado realista. O schema não tem campos de pessoa, porque o Shopper é anônimo, e não foi alterado para o seed.
