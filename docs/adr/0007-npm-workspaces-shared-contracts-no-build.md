# npm workspaces with shared API contracts and no TypeScript build step

The repo is an npm workspace with three packages: `backend/`, `frontend/` and `shared/`. `shared/` holds only the API contracts: TypeBox schemas for each route and the types derived from them. Fastify uses the same schemas for runtime validation, and the frontend's `api/` layer uses them for types, so a contract change breaks both sides in the same commit. We did not add Turborepo: with three packages and no build graph its caching and task ordering buy nothing, and the evaluator always runs from scratch in containers.

TypeScript is never compiled to `dist/`. `shared/` exports its `.ts` sources, Vite consumes them directly, and the backend runs on Node 24's native type stripping (`node src/server.ts`, `node --watch` in dev). The tsconfig therefore enables `erasableSyntaxOnly` and `rewriteRelativeImportExtensions`: no `enum`, `namespace` or parameter properties, and relative imports carry the `.ts` extension. `tsc --noEmit` still runs in `make check`.

## Considered Options

- **Separate repos or relative imports across packages**: the frontend Docker build context would not include the backend's types.
- **OpenAPI + codegen**: works without a monorepo, but adds a generation step.
- **Zod instead of TypeBox**: more popular, but Fastify's native format is JSON Schema, which TypeBox produces directly.
- **`tsc` to `dist/` or `tsx` at runtime**: an extra build step in every Dockerfile and in dev, for no benefit on Node 24.
