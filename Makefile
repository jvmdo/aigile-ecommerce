COMPOSE := docker compose

.PHONY: up down logs migrate check test-unit test-integration

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
