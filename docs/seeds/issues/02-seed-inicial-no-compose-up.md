# 02: Seed inicial no `docker compose up`

**Spec:** sem FRD. Critério 2 de entrega do curso: depois de `docker compose up`, sem passos manuais, "a listagem de produtos deve exibir os dados do seed". Decidido na verificação final de 18/11/2026. Ticket anterior: [01](01-seed.md).

**What to build:** hoje o seed só roda com `make seed`, e um `docker compose up` num clone limpo mostra o catálogo vazio. Um serviço de execução única passa a rodar o seed depois do `migrate` e antes da `api` subir, **só quando o banco ainda não tem Products**. Assim a primeira subida já mostra os dados de demonstração, as subidas seguintes não apagam nada e `make seed` continua sendo a forma de recriar os dados de propósito.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] O seed ganha um modo "só se vazio": com algum Product no banco, não apaga nem insere nada e informa que pulou; sem Products, roda o seed completo.
- [x] Serviço `seed-initial` no `docker-compose.yml`, sem profile, que roda esse modo depois do `migrate`; a `api` só sobe depois de ele terminar com sucesso.
- [x] A stack E2E não roda o seed inicial: cada teste E2E continua inserindo os próprios dados.
- [x] Teste de integração: com Products no banco, o modo "só se vazio" não altera nada; com o banco vazio, ele povoa.
- [x] README e `docs/seeds-report.md` dizem que a primeira subida já traz os dados de demonstração e que `make seed` os recria.
- [x] Num clone limpo, `docker compose up -d --build --wait` deixa `GET /api/products` com os Products do seed; um segundo `up` não os recria; `make test` verde.

## Comments

- Verificado com um projeto compose novo (`-p verify-seed`, volume vazio): o primeiro `up -d --build --wait` levou cerca de 34 s, o `seed-initial` gerou os dados e `GET /api/products` devolveu 300 Products; um segundo `up` registrou "seed inicial ignorado" e os 300 Products continuaram lá. `make test` verde: 31 unitários, 136 de integração, 21 E2E.
