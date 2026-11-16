# Especificação do Scaffolding

**Status:** ready-for-agent

Decisões de fundo: [GLOSSARY.md](../GLOSSARY.md) e ADRs [0001](adr/0001-postgresql-database.md) a [0007](adr/0007-npm-workspaces-shared-contracts-no-build.md).

## Problem Statement

O repositório do e-commerce simplificado ainda não tem código. Antes de desenvolver a feature do Cart, o desenvolvedor precisa de uma base que já funcione de ponta a ponta: uma stack que sobe com um comando, uma suíte de testes que roda com um comando e uma estrutura de camadas (backend e frontend) clara o bastante para que cada feature nova seja "só mais uma pasta". O avaliador do curso, por sua vez, vai descompactar o projeto numa máquina limpa e exigir que `docker compose up` e `make test` funcionem sem nenhum passo manual nem dependência instalada fora dos containers. Sem essa base, cada feature reinventaria infraestrutura, testes e convenções, e a entrega correria o risco de não subir na máquina do avaliador.

## Solution

Um esqueleto que atravessa todas as camadas e entrega um fluxo real e pequeno: o **catálogo de Products**. Um único `docker compose up` sobe o banco PostgreSQL, aplica as migrations, sobe a API e o frontend, e a página do catálogo lista os Products do banco com preço em reais e o Stock disponível, marcando "Esgotado" quando não há unidades. A API expõe `/health` (que verifica o banco) e a listagem de Products. Um único `make test` executa testes de unidade, integração e E2E dentro de containers. Para o dia a dia, `make dev` sobe o banco e roda backend e frontend com recarga automática. Cart, Coupon e Order ficam para as features seguintes, e cada uma entra nesta mesma estrutura.

## User Stories

### Avaliador

1. Como avaliador, quero subir todo o sistema com `docker compose up` numa máquina que só tem Docker, para verificar a entrega sem instalar nada.
2. Como avaliador, quero que `docker compose up` funcione sem criar nenhum arquivo `.env`, para não depender de passos manuais.
3. Como avaliador, quero que as migrations do banco sejam aplicadas automaticamente antes de a API aceitar requisições, para nunca ver a API rodando contra um banco sem tabelas.
4. Como avaliador, quero acessar `/health` e receber `200 OK` quando a stack está saudável, para confirmar que a API está no ar.
5. Como avaliador, quero que `/health` responda pelo endereço do frontend e pelo endereço direto da API, para verificar por qualquer um dos dois.
6. Como avaliador, quero abrir o frontend no navegador e ver a listagem de Products, para confirmar que frontend, API e banco estão integrados.
7. Como avaliador, quero rodar a suíte completa (unidade, integração e E2E) com um único `make test`, para verificar os testes sem conhecer as ferramentas do projeto.
8. Como avaliador, quero que `make test` rode inteiramente em containers, para que o resultado não dependa do que está instalado na minha máquina.
9. Como avaliador, quero que `make test` termine com código de saída diferente de zero se qualquer teste falhar, para que a falha seja inequívoca.
10. Como avaliador, quero que o README documente as portas, os comandos e o que verificar, para avaliar o projeto sem adivinhar nada.
11. Como avaliador, quero que o repositório não contenha dependências instaladas, builds nem volumes de banco, para que o zip da entrega seja enxuto.

### Comprador

12. Como comprador, quero ver a lista de todos os Products do catálogo, para saber o que está à venda.
13. Como comprador, quero ver nome, descrição, preço e Stock de cada Product, para decidir o que comprar.
14. Como comprador, quero ver o preço formatado em reais (por exemplo, "R$ 19,99"), para entender o valor sem fazer contas.
15. Como comprador, quero ver os Products em ordem alfabética de nome, para encontrar um Product com facilidade.
16. Como comprador, quero ver claramente quando um Product está "Esgotado" (Stock zero), para não tentar comprar algo indisponível.
17. Como comprador, quero ver uma mensagem clara quando o catálogo está vazio, para saber que não há erro, apenas nenhum Product.
18. Como comprador, quero ver uma mensagem de erro amigável quando a API não responde, para entender que o problema não é meu.

### Desenvolvedor

19. Como desenvolvedor, quero rodar `make dev` e ter banco, migrations, backend e frontend rodando com recarga automática, para desenvolver sem reconstruir imagens.
20. Como desenvolvedor, quero ver os logs do backend e do frontend no mesmo terminal, prefixados e coloridos, para acompanhar os dois processos.
21. Como desenvolvedor, quero que Ctrl+C encerre backend e frontend de dev e deixe o banco rodando, para reiniciar rápido.
22. Como desenvolvedor, quero que o frontend de dev faça proxy de `/api` e `/health` para o backend, para usar os mesmos caminhos de produção.
23. Como desenvolvedor, quero rodar cada nível de teste isoladamente (`make test-unit`, `make test-integration`, `make test-e2e`), para ter feedback rápido no nível em que estou trabalhando.
24. Como desenvolvedor, quero rodar `make check` para fazer typecheck e lint/formatação de todo o monorepo, para pegar erros mecânicos antes do commit.
25. Como desenvolvedor, quero comandos `make up`, `make down`, `make logs` e `make migrate`, para operar a stack sem decorar comandos do Docker.
26. Como desenvolvedor, quero definir o contrato de cada rota uma única vez no pacote compartilhado, para que a validação do backend e os tipos do frontend nunca divirjam.
27. Como desenvolvedor, quero que uma mudança de contrato quebre o typecheck do backend e do frontend no mesmo commit, para descobrir a divergência na hora.
28. Como desenvolvedor, quero que o backend rode TypeScript direto, sem etapa de build, para ter menos passos no dev e nos Dockerfiles.
29. Como desenvolvedor, quero que o backend seja organizado por feature, com Controller, Service e Repository em cada uma, para que adicionar o Cart seja criar uma pasta nova seguindo o mesmo padrão.
30. Como desenvolvedor, quero que a aplicação seja montada a partir das dependências recebidas (conexão com o banco, configuração), para que os testes de integração usem o banco de teste sem truques.
31. Como desenvolvedor, quero que o frontend separe Presentation, Domain e API, para que a lógica de formatação e de regras de exibição seja testável sem navegador.
32. Como desenvolvedor, quero que o backend valide sua configuração ao iniciar e falhe com uma mensagem clara se algo estiver faltando ou inválido, para não descobrir o problema no meio de uma requisição.
33. Como desenvolvedor, quero um `.env.example` documentando cada variável e seu valor padrão, para saber o que posso ajustar.
34. Como desenvolvedor, quero que requisições com entrada malformada recebam `400` com um formato de erro único, para que o frontend trate todos os erros do mesmo jeito.
35. Como desenvolvedor, quero que esse formato de erro único já esteja pronto para as violações de regra de negócio (`409`/`422`) das próximas features, para não redesenhá-lo depois.
36. Como desenvolvedor, quero que os testes de integração usem um database separado (`ecommerce_test`), migrado e limpo a cada execução, para que testes e dados de desenvolvimento não interfiram entre si.
37. Como desenvolvedor, quero que os valores monetários sejam inteiros em centavos em todo o sistema, para que nenhuma conta sofra com arredondamento de ponto flutuante.
38. Como desenvolvedor, quero que todas as entidades usem UUID, para que nenhum identificador seja enumerável pela API.
39. Como desenvolvedor, quero que o `.gitignore` cubra dependências, builds, relatórios de teste e arquivos de ambiente locais, para que nada gerável entre no histórico.

### Operação

40. Como operador da stack, quero que o Postgres tenha healthcheck e que os serviços dependentes só subam quando ele estiver pronto, para evitar falhas de inicialização por corrida.
41. Como operador da stack, quero que o container da API use `/health` como healthcheck e que o frontend só suba quando a API estiver saudável, para que o primeiro acesso ao frontend já funcione.
42. Como operador da stack, quero que `/health` responda `503` quando o banco estiver inacessível, para que o healthcheck reflita a saúde real.
43. Como operador da stack, quero que o serviço de migrations rode uma vez e termine, para que as migrations não fiquem misturadas com a inicialização da API.

## Implementation Decisions

### Estrutura do repositório

- Monorepo com npm workspaces e três pacotes de aplicação: **backend**, **frontend** e **shared** (contratos da API). Um quarto workspace, **e2e**, guarda só os testes Playwright. Sem Turborepo nem pnpm (ADR 0007).
- Na raiz: `docker-compose.yml`, `docker-compose.e2e.yml` (override da stack de E2E, ADR 0004), `Makefile`, `README.md`, `.env.example`, `.gitignore`, configuração do Biome, tsconfig base e o `package.json` dos workspaces.
- Node 24 em todo lugar (host de dev e imagens). Única exceção: a imagem oficial do Playwright traz o próprio Node (22 na 1.52.0), onde só roda o runner de testes (ADR 0008).

### Pacote shared (contratos)

- Contém apenas schemas TypeBox das rotas e os tipos derivados deles. Nenhuma regra de negócio.
- Exporta os fontes `.ts` diretamente, sem build.
- Neste scaffolding define: o schema de Product na resposta (`id`, `name`, `description`, `priceCents`, `stock`), a resposta da listagem, a resposta do health e o **envelope de erro** `{ error: { code, message, details? } }`.

### Backend

- Fastify 5 com o type provider de TypeBox. A validação de entrada e a serialização de saída usam os schemas do pacote shared.
- Roda com o type stripping nativo do Node 24, em produção e em dev (com `--watch`). O tsconfig ativa `erasableSyntaxOnly` e `rewriteRelativeImportExtensions`: sem `enum`, `namespace` nem parameter properties, e imports relativos com extensão `.ts`.
- Organização **por feature**: um módulo `products` (Controller, Service, Repository), um módulo `health` e um módulo de banco (schema Drizzle, conexão e migrations).
- **Montagem da aplicação**: uma função que recebe as dependências (conexão com o banco e configuração) e devolve a instância do Fastify sem dar `listen`. Um ponto de entrada separado lê a configuração, cria a conexão e dá `listen`. Essa função é a seam dos testes de integração.
- Camadas: o Controller recebe a requisição HTTP e delega ao Service; o Service contém a lógica de negócio (no scaffolding, apenas repassa) e delega ao Repository; o Repository encapsula o Drizzle.
- **Configuração**: lida de variáveis de ambiente e validada ao iniciar (com schema TypeBox). Configuração inválida derruba o processo com uma mensagem clara.
- **Tratamento de erros**: erros de validação de schema viram `400` no envelope de erro; erros inesperados viram `500` no mesmo envelope, sem vazar stack trace. O envelope já prevê os códigos de regra de negócio (`409`/`422`) das próximas features.
- Logs com o logger padrão do Fastify (pino).

### Contrato da API

- `GET /health`: executa `SELECT 1` no banco. Responde `200 { status: "ok" }` quando o banco está acessível e `503` no envelope de erro quando não está. Fica na raiz, fora do prefixo `/api`.
- `GET /api/products`: devolve **todos** os Products, ordenados por nome (crescente), sem paginação, filtro ou busca. Cada item tem `{ id, name, description, priceCents, stock }`. Catálogo vazio devolve lista vazia com `200`.
- Todos os recursos de negócio ficam sob o prefixo `/api`.

### Banco de dados

- PostgreSQL (ADR 0001), acessado com Drizzle (ADR 0002). Migrations geradas e aplicadas com `drizzle-kit`.
- Tabela de Products: `id` UUID gerado pelo banco (`gen_random_uuid()`, ADR 0006), `name` texto obrigatório, `description` texto não nulo com padrão `''` (o contrato sempre devolve uma string), `price_cents` inteiro maior ou igual a 0, `stock` inteiro maior ou igual a 0 (constraints de check no banco).
- Valores monetários em centavos inteiros, moeda única BRL (ADR 0005).
- Dois databases no mesmo serviço: o de aplicação e o `ecommerce_test` para os testes de integração.
- Não há seed neste scaffolding: os dados de demonstração vêm no Passo 7. Os testes criam os próprios dados.

### Frontend

- Vite + TypeScript + Web Components nativos, sem biblioteca de UI (ADR 0003).
- Três camadas:
  - **Presentation** (páginas e custom elements): a página do catálogo renderiza a lista, o estado vazio e o estado de erro.
  - **Domain** (funções puras): formatação de centavos em reais e a regra de exibição "Esgotado" (Stock igual a zero).
  - **API**: módulo que faz `fetch` em `/api/products` e tipa a resposta com os tipos do pacote shared.
- A página do catálogo mostra, para cada Product, nome, descrição, preço formatado e Stock, e o selo "Esgotado" quando o Stock é zero.
- CSS mínimo: o frontend é despretensioso por design.

### Infraestrutura (docker compose)

- Serviços:
  - `db`: Postgres com healthcheck e volume nomeado.
  - `migrate`: execução única; aplica as migrations e termina.
  - `api`: Fastify na porta `8800`; depende de `db` saudável e de `migrate` concluído com sucesso; healthcheck em `/health`.
  - `web`: nginx com o build do Vite na porta `8080`; depende de `api` saudável; faz proxy de `/api/*` e `/health` para a API sem reescrever o caminho.
  - Um serviço de testes E2E com a imagem oficial do Playwright, ativado só por profile de teste. Ele fica em `docker-compose.e2e.yml` e roda como projeto compose próprio, com volume de banco separado e sem portas no host, para nunca tocar nos dados de desenvolvimento (ADR 0004).
- Todas as variáveis têm valor padrão no compose (`${VAR:-default}`), então nenhum `.env` é obrigatório. O `.env.example` documenta cada uma.
- Portas no host: frontend `8080`, API `8800`, Postgres `5432`.
- Dockerfiles multi-stage com a raiz do monorepo como contexto, instalando só o workspace necessário. O do frontend faz o build do Vite e copia os estáticos para o nginx.

### Makefile

- `make up` / `make down`: sobe e derruba a stack.
- `make test`: suíte completa (unidade, integração e E2E) dentro de containers; falha se qualquer nível falhar.
- `make test-unit`, `make test-integration`, `make test-e2e`: cada nível isolado.
- `make check`: `tsc --noEmit` em todos os workspaces e Biome.
- `make migrate`, `make logs`.
- `make dev`: sobe só o Postgres, espera o healthcheck, aplica as migrations e roda em paralelo, via `concurrently`, o backend com `node --watch` (porta 8800) e o Vite dev server (porta 5173, com proxy de `/api` e `/health` para 8800). Ctrl+C encerra os dois e mantém o Postgres. Também disponível como `npm run dev`.

### Qualidade

- Biome para lint e formatação de todo o monorepo.
- Vitest para unidade e integração, Playwright para E2E (ADR 0004).

### Documentação

- O README documenta: o que é o projeto, pré-requisito (só Docker), `docker compose up`, portas e URLs de verificação (frontend, `/health`, listagem), `make test`, os demais alvos do Makefile e o fluxo de `make dev`.

## Testing Decisions

### O que é um bom teste aqui

- Testa comportamento observável por uma interface pública, nunca detalhes de implementação. Um teste não deve quebrar quando a estrutura interna muda e o comportamento não.
- Os valores esperados vêm de uma fonte independente (literais conhecidos, exemplos da spec), nunca recalculados do jeito que o código calcula.
- Nenhum mock de colaboradores internos. O banco é real (o database de teste), não um dublê.

### Seams acordadas (só se testa nelas)

1. **App HTTP do backend (integração)**: a aplicação montada com as dependências de teste, exercitada com `inject()` do Fastify contra o PostgreSQL real no database `ecommerce_test`, migrado e limpo a cada execução. Cobre:
   - `GET /api/products` devolve os campos do contrato, ordenados por nome;
   - catálogo vazio devolve lista vazia;
   - um Product com Stock zero aparece com `stock: 0`;
   - `/health` responde `200` com o banco acessível e `503` com uma conexão inválida nas dependências;
   - erro de validação devolve `400` no envelope de erro (testado numa rota que tenha entrada, ou registrado para cobrir quando a primeira aparecer, já que a listagem não recebe parâmetros).
2. **Navegador contra a stack do compose (E2E)**: Playwright em container acessando o frontend via nginx na porta `8080`. Cobre: a página do catálogo exibe os Products do banco com preço em reais; o selo "Esgotado" aparece para Stock zero; `/health` responde `200` via nginx. Os dados de que o teste precisa são inseridos pelo próprio teste ou por um setup de teste, não pelo seed do Passo 7.
3. **Domain do frontend (unidade)**: funções puras testadas com Vitest. Cobre: formatação de centavos em reais (`1999` → "R$ 19,99", `0` → "R$ 0,00", valores com milhar) e a regra "Esgotado" (Stock zero sim, Stock positivo não).

### Deliberadamente sem seam própria

- Service e Repository do backend isolados: no scaffolding o Service só repassa, então testá-lo com dublês acoplaria o teste à implementação. A seam 1 exercita as camadas de verdade. Os testes de unidade de Service entram nas features que trouxerem regra de negócio.
- Os Web Components: cobertos pela seam 2.

### Prior art

- Não há testes no repositório ainda. Estes testes serão o padrão seguido pelas features: integração via a função de montagem + `inject()` + database de teste, E2E via Playwright contra o compose, unidade no Domain do frontend.

## Out of Scope

- Cart, Cart Item, Coupon, Order e Order Item (entidades, tabelas, rotas e páginas): ficam para as features.
- Regras de desconto, estratégia de estoque e estados do Cart: decididas no Passo 2.
- Seed de dados de demonstração: Passo 7.
- Paginação, filtros e busca no catálogo.
- Autenticação e autorização, gateway de pagamento, notificações, upload de imagens, busca full-text e CI/CD (fora do escopo do sistema).
- Hot reload dentro de containers (`compose.dev.yml` com bind mounts): o dev roda no host.
- CSS e UX além do mínimo funcional.

## Further Notes

- Este documento é o entregável `docs/scaffolding-specification.md` do Passo 1.1 do curso. O blueprint (`docs/scaffolding-blueprint.md`) e os tickets (`docs/scaffolding/issues/`) vêm a seguir, via `/to-tickets`.
- A verificação do scaffolding (`docs/scaffolding-review-report.md`) será feita com `/code-review` contra esta spec.
- A versão do Node nas imagens deve coincidir com a do host de dev (Node 24) para que o type stripping se comporte igual nos dois ambientes. A imagem do Playwright é a exceção registrada na ADR 0008: ela não usa type stripping, porque o Playwright compila o TypeScript dos testes.
