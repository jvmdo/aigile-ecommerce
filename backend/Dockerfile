# Build context: the monorepo root (see docker-compose.yml).
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Integration tests: backend with dev dependencies (Vitest).
FROM base AS test
RUN npm ci --workspace @aigile/backend --include-workspace-root=false
COPY tsconfig.base.json ./
COPY shared/ shared/
COPY backend/ backend/
WORKDIR /app/backend
CMD ["npm", "run", "test:integration"]

# Runtime: TypeScript runs directly on Node 24 type stripping, no build step (ADR 0007).
FROM base AS runtime
ENV NODE_ENV=production
RUN npm ci --workspace @aigile/backend --include-workspace-root=false --omit=dev \
  && npm cache clean --force
COPY shared/src shared/src
COPY backend/src backend/src
USER node
WORKDIR /app/backend
EXPOSE 8800
CMD ["node", "src/server.ts"]
