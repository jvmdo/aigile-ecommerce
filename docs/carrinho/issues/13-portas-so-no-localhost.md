# 13: Banco e API publicados só no localhost

**Spec:** [Especificação do scaffolding](../../scaffolding-specification.md); [relatório de segurança](../security-report-carrinho.md): S6, S7

**What to build:** corrigir S6 e S7 do [relatório de segurança](../security-report-carrinho.md). O `docker-compose.yml` publica o PostgreSQL (`5432`, usuário e senha padrão, papel superusuário) e a API (`8800`) em todas as interfaces do host, então qualquer máquina da rede alcança o banco e contorna o nginx. As duas portas passam a ser publicadas só em `127.0.0.1`. As URLs `localhost` do README, `make dev` e os alvos de teste no host continuam funcionando; o frontend (`8080`) continua aberto como está.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `db` e `api` publicam suas portas em `127.0.0.1` no `docker-compose.yml`; `frontend` não muda.
- [x] O README diz que banco e API só aceitam conexões do próprio host.
- [x] `docker compose up` sobe a stack; `http://localhost:8800/health` e `http://localhost:8080` respondem `200`; `make test` verde.
- [x] Criar um papel sem superusuário para a API fica fora deste ticket, registrado como risco aceito no relatório de segurança.

## Comments

- Verificado: `docker ps` mostra `127.0.0.1:5432` e `127.0.0.1:8800`; `localhost:8800/health` e `localhost:8080` respondem `200`; a API pelo IP de rede do host recusa a conexão; `make test` verde (31 + 130 + 20).
