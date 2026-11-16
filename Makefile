COMPOSE := docker compose
# The E2E stack runs as its own compose project (see docker-compose.e2e.yml).
E2E_COMPOSE := $(COMPOSE) -p aigile-ecommerce-e2e -f docker-compose.yml -f docker-compose.e2e.yml --profile test

.PHONY: up down logs migrate check test test-unit test-integration test-e2e

up: ## Build and start the stack in the background, waiting until it is healthy
	$(COMPOSE) up -d --build --wait

down: ## Stop the stack (keeps the database volume)
	$(COMPOSE) down

logs: ## Follow the logs of every service
	$(COMPOSE) logs -f

migrate: ## Apply the database migrations (one-shot migrate service) and exit
	$(COMPOSE) run --rm --build migrate

check: ## Typecheck every workspace and run Biome (needs Node 24 and npm install on the host)
	npm run check

test-unit: ## Frontend Domain unit tests, in a container
	$(COMPOSE) --profile test run --rm --build test-unit

test-integration: ## Backend integration tests against the ecommerce_test database, in containers
	$(COMPOSE) --profile test run --rm --build test-integration

test-e2e: ## Playwright against a fresh, isolated compose stack through nginx; removes that stack afterwards
	$(E2E_COMPOSE) down -v --remove-orphans
	$(E2E_COMPOSE) run --rm --build test-e2e; status=$$?; \
	$(E2E_COMPOSE) down -v --remove-orphans; \
	exit $$status

test: test-unit test-integration test-e2e ## The full suite (unit, integration, E2E) in containers; stops at the first level that fails
