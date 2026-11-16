# Build context: the monorepo root (see docker-compose.e2e.yml).
# The image tag must match the exact @playwright/test version in e2e/package.json (ADR 0008).
FROM mcr.microsoft.com/playwright:v1.52.0-noble
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
# The image ships Node 22, below the root "engines" field; only the Playwright runner and pg run here.
RUN npm ci --workspace @aigile/e2e --include-workspace-root=false
COPY tsconfig.base.json ./
COPY e2e/ e2e/
WORKDIR /app/e2e
CMD ["npm", "run", "test:e2e"]
