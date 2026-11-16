# Build context: the monorepo root (see docker-compose.yml).
FROM node:24-alpine AS deps
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
RUN npm ci --workspace @aigile/frontend --include-workspace-root=false
COPY tsconfig.base.json ./
COPY shared/ shared/
COPY frontend/ frontend/
WORKDIR /app/frontend

# Unit tests of the Domain layer.
FROM deps AS test
CMD ["npm", "run", "test:unit"]

# Static build with Vite.
FROM deps AS build
RUN npm run build

# Runtime: nginx serves the build and proxies the API (ADR 0003).
FROM nginx:1.27-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
