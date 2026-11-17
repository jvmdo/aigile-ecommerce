# Coding Standards

Judgement-call rules for reviewers. Anything a tool can enforce (formatting, lint, types) belongs in Biome or the tsconfig, not here. Background decisions live in `docs/adr/`; domain terms in `GLOSSARY.md`.

## Backend layers

- **Controller** handles HTTP only: reads the validated request, calls a Service, maps the result or a domain error to a response. No Drizzle, no business rules.
- **Service** holds business rules. It knows nothing about HTTP (no request/reply objects, no status codes) and reaches the database only through a Repository.
- **Repository** wraps Drizzle and returns plain domain data. No business rules, no HTTP.
- Code is grouped by feature (one folder per feature with its Controller, Service and Repository), not by layer.
- A Service that writes through several Repositories atomically uses `InTransaction` (ADR 0010).
- Dependencies (database connection, config) are passed in when the app is built, never imported as module-level singletons, so tests can supply the test database.

## Errors

- Every error response uses the shared error envelope `{ error: { code, message, details? } }`.
- Malformed input → `400`, rejected by the route schema. Business-rule violations (insufficient Stock, expired Coupon, forbidden status transition) → `409` or `422`, raised by the Service as a domain error and mapped by the Controller or error handler.
- Never leak stack traces or database errors in a response.

## Contracts

- Route request/response schemas live only in the `shared` package. Backend and frontend import them; neither redefines an API shape locally.
- Types that mirror a contract shape (error `details`, Cart or Order items, money fields) are aliases or `Pick`s of the `shared` types, not local copies with the same fields.

## Frontend layers

- **Presentation** (pages, custom elements) renders and handles DOM events. It calls Domain for decisions and API for data.
- **Domain** is pure functions: no DOM, no `fetch`, no globals. Formatting and display rules live here.
- **API** is the only layer that calls `fetch`, and it returns data typed with the `shared` contracts.

## Domain

- Use `GLOSSARY.md` terms in code, tests and messages (`Cart`, not `Basket`). Code identifiers are in English; user-facing text is in Portuguese.
- Money is integer cents (`priceCents`) everywhere; convert to "R$ 19,99" only in the frontend Domain formatter (ADR 0005).
- Entity ids are UUIDs; never expose or accept sequential ids (ADR 0006).

## Tests

- Test only at the seams agreed in the spec. Assert observable behaviour; never mock internal collaborators or query the database to verify what the API already returns. Querying the database is fine for state the API does not expose (e.g. that no Order was created, since there is no Order listing).
- Expected values come from literals or the spec, never recomputed the way the code computes them.
