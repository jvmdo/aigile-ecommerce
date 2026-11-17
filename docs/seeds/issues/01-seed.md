# 01: Seed de dados sintéticos

**Spec:** sem FRD. As decisões vêm da sessão de grilling de 2026-11-17 sobre o Passo 7 e estão resumidas em "Decisões" abaixo. Glossário: [GLOSSARY.md](../../../GLOSSARY.md).

**What to build:** um comando `make seed` que apaga os dados do banco da aplicação e o popula com dados sintéticos realistas e volumosos para demonstração e exploração manual: cerca de 300 Products, 40 Coupons, 1.000 Shoppers, 1.500 Carts nos cinco Cart Status e 700 Orders. Carts e Orders são criados pelos Services reais com um relógio controlável, então respeitam todas as regras de domínio e têm datas espalhadas pelos últimos meses. Um conjunto pequeno de Shoppers de demonstração, com ids fixos, deixa cada caso de borda acessível pelo navegador. O relatório do que foi gerado fica em `docs/seeds-report.md`.

**Blocked by:** nenhum

**Status:** resolved

## Decisões

- Só para demonstração: nenhum teste depende do seed, e o seed nunca toca o `ecommerce_test` nem a stack do E2E.
- `make seed` é explícito, roda num serviço de execução única do compose (ADR 0004) e nunca roda sozinho em `make up` ou `make dev`. Cada execução apaga Orders, Carts, Coupons e Products e recria tudo.
- Carts e Orders passam pelo Service de carts com relógio controlável. Products e Coupons não têm API e são inseridos direto. Mudanças de preço e de Stock "feitas por outra pessoa" também são escritas direto, porque simulam ações que o sistema não oferece.
- `@faker-js/faker` ~9.9 com locale `pt_BR` e semente fixa, registrado na ADR 0008. As datas são relativas ao instante da execução.
- O schema não muda: o Shopper continua anônimo, e o realismo vem de Products, Coupons e da linha do tempo de Carts e Orders.
- Nenhum Product grátis: o preço mínimo é 1 centavo.
- Carts parados há mais de 24h ficam gravados como `with_items`/`checkout`. O abandono por tempo é avaliado sob demanda, então eles só passam a Abandoned quando alguém os consulta.
- O catálogo continua sem paginação. O efeito dos 300 Products numa página só é registrado no relatório como achado.

## Critérios

- [x] `make seed` roda num serviço `seed` do compose (alvo `seed` do `backend/Dockerfile`), depois das migrations, e imprime as contagens e o tempo gasto.
- [x] O script se recusa a rodar quando o database da URL é `ecommerce_test`.
- [x] Rodar duas vezes produz o mesmo estado: tudo é apagado e recriado, os ids fixos dos Shoppers e Carts de demonstração se repetem e os dados aleatórios são os mesmos pela semente fixa.
- [x] Products realistas em português: Stock 0, Stock 1 e Stock alto; preço de 1 centavo e preço alto; descrição vazia e preenchida.
- [x] Coupons com códigos realistas: de 1%, de 100%, fixo maior que um Subtotal comum, já expirado e que vence em poucas horas, além dos comuns.
- [x] Carts nos cinco status; Abandoned dos dois jeitos (explícito e por 24h); Carts parados há mais de 24h ainda gravados como `with_items`/`checkout`.
- [x] Orders com e sem Coupon, nenhum Shopper usando o mesmo Coupon em dois Orders, Stock decrementado pelos Orders.
- [x] Cart Item com quantidade 99 e Cart Item com preço unitário diferente do preço atual do Product.
- [x] Shoppers de demonstração com Shopper id e Cart id fixos, um por cenário: Com Itens (quantidade 99 e preço defasado), checkout com Coupon expirado, checkout com Stock insuficiente, Coupon já usado pelo Shopper, Cart parado há mais de 24h, Coupon de 100%, Coupon fixo maior que o Subtotal, Vazio e Abandonado.
- [x] Teste de integração na seam do app HTTP: semeia o `ecommerce_test` com volume reduzido e verifica pela API o comportamento de cada Shopper de demonstração, a presença dos cinco status e dos casos de borda do catálogo, e que uma segunda execução recria o mesmo estado.
- [x] `faker` adicionado à ADR 0008; `make seed` documentado no README.
- [x] `docs/seeds-report.md`: contagens por entidade e por status; casos de borda; tabela dos Shoppers de demonstração com o trecho de `localStorage` para assumir cada um; achado do catálogo sem paginação; nota de que o banco aceitaria preço zero; verificação de fumaça (`/health`, tempo e tamanho de `GET /api/products`, compra completa pelo navegador).
