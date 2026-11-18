# 15: Cabeçalhos de segurança no nginx

**Spec:** [FRD do Carrinho](../frd-carrinho.md): Frontend; [relatório de segurança](../security-report-carrinho.md): S8

**What to build:** corrigir S8 do [relatório de segurança](../security-report-carrinho.md). O nginx do frontend não envia cabeçalhos de segurança e anuncia a própria versão. Ele passa a enviar, em toda resposta, uma Content Security Policy restrita à própria origem, `X-Content-Type-Options: nosniff`, proteção contra o uso da página em frames e `Referrer-Policy`, e deixa de mostrar a versão.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `frontend/nginx.conf` envia `Content-Security-Policy` (`default-src 'self'`, sem `unsafe-inline`; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` e `Referrer-Policy: no-referrer`, inclusive nas respostas de `/assets/` e das rotas proxiadas.
- [x] `server_tokens off`.
- [x] O E2E (`make test-e2e`) passa inteiro com a CSP ativa, o que prova que a página não depende de script ou estilo inline.
- [x] Um teste E2E verifica que a página do catálogo chega com a CSP e o `nosniff`.

## Comments

- Os cabeçalhos ficam num arquivo próprio, `frontend/nginx-security-headers.conf`, incluído no `server` e de novo em `/assets/`: um `add_header` dentro de um `location` faz o nginx ignorar os do `server`.
- O teste E2E novo está em `e2e/tests/catalog.spec.ts` e confere `/` e `/api/products`. `make test-e2e`: 21 testes verdes. Na stack local, um asset de `/assets/` também chega com a CSP e o `Cache-Control` imutável.
