# Dependency versions pinned to what agents know well

This project is built by coding agents, so we pin each dependency to a major/minor the agents have solid knowledge of, not to the newest release. An API that changed after an agent's knowledge cutoff causes subtle, confidently-wrong code; a slightly older but well-known version does not. Upgrades are a deliberate decision, not a side effect of `npm install`.

| Package | Version | Notes |
| --- | --- | --- |
| Node.js (host and images) | 24 | Native type stripping (ADR 0007). Exception: the Playwright image ships its own Node (22 in 1.52.0); only the test runner runs there, and Playwright compiles the TypeScript itself |
| `typescript` | ~5.8 | First version with `erasableSyntaxOnly` |
| `@types/node` | ^24 | |
| `fastify` | ^5 | |
| `@sinclair/typebox` | ~0.34 | Not the renamed `typebox` 1.x package |
| `@fastify/type-provider-typebox` | ^5.1 | Peer range accepts TypeBox 0.34 |
| `drizzle-orm` | ~0.44 | Pre-1.0 API |
| `drizzle-kit` | ~0.31 | Matches `drizzle-orm` 0.44 |
| `pg` / `@types/pg` | ^8 | `node-postgres` driver for Drizzle |
| `vite` | ^6 | |
| `vitest` | ^3.2 | |
| `@playwright/test` and image `mcr.microsoft.com/playwright` | 1.52.0 (exact, same in both) | The npm package and the Docker image must match |
| `@biomejs/biome` | 1.9.4 (exact) | 1.x config format, not Biome 2 |
| `concurrently` | ^9 | |
| PostgreSQL image | `postgres:17-alpine` | |
| nginx image | `nginx:1.27-alpine` | |

`~` is used for 0.x packages, where a minor bump may break the API. `package-lock.json` is committed, so installs are exact.
