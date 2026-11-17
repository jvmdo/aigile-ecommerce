COMPOSE := docker compose

# make dev runs the backend on the host, outside compose: build its DATABASE_URL from the same
# POSTGRES_* values (root .env, else the compose defaults), unless .env or the shell sets one.
-include .env
DATABASE_URL ?= postgres://$(or $(POSTGRES_USER),ecommerce):$(or $(POSTGRES_PASSWORD),ecommerce)@localhost:$(or $(POSTGRES_PORT),5432)/$(or $(POSTGRES_DB),ecommerce)
# Host-side integration tests use the ecommerce_test database of the compose Postgres.
TEST_DATABASE_URL ?= postgres://$(or $(POSTGRES_USER),ecommerce):$(or $(POSTGRES_PASSWORD),ecommerce)@localhost:$(or $(POSTGRES_PORT),5432)/ecommerce_test
# The E2E stack runs as its own compose project (see docker-compose.e2e.yml).
E2E_COMPOSE := $(COMPOSE) -p aigile-ecommerce-e2e -f docker-compose.yml -f docker-compose.e2e.yml --profile test

.PHONY: up down logs migrate dev check test test-unit test-integration test-integration-host test-e2e

up: ## Build and start the stack in the background, waiting until it is healthy
	$(COMPOSE) up -d --build --wait

down: ## Stop the stack (keeps the database volume)
	$(COMPOSE) down

logs: ## Follow the logs of every service
	$(COMPOSE) logs -f

migrate: ## Apply the database migrations (one-shot migrate service) and exit
	$(COMPOSE) run --rm --build migrate

dev: ## Postgres in a container, migrations applied, backend and Vite with reload on the host (needs Node 24 and npm install)
	$(COMPOSE) up -d --wait db
	$(MAKE) migrate
	DATABASE_URL='$(DATABASE_URL)' npm run dev

check: ## Typecheck every workspace and run Biome (needs Node 24 and npm install on the host)
	npm run check

test-unit: ## Frontend Domain unit tests, in a container
	$(COMPOSE) --profile test run --rm --build test-unit

test-integration: ## Backend integration tests against the ecommerce_test database, in containers
	$(COMPOSE) --profile test run --rm --build test-integration

test-integration-host: ## Backend integration tests on the host against the compose Postgres, fast loop; one file with FILE=test/integration/orders.test.ts (needs Node 24 and npm install)
	$(COMPOSE) up -d --wait db
	cd backend && TEST_DATABASE_URL='$(TEST_DATABASE_URL)' npx vitest run $(FILE)

test-e2e: ## Playwright against a fresh, isolated compose stack through nginx; removes that stack afterwards
	$(E2E_COMPOSE) down -v --remove-orphans
	$(E2E_COMPOSE) run --rm --build test-e2e; status=$$?; \
	$(E2E_COMPOSE) down -v --remove-orphans; \
	exit $$status

test: test-unit test-integration test-e2e ## The full suite (unit, integration, E2E) in containers; stops at the first level that fails
