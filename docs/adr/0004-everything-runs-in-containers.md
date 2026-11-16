# Everything the evaluator runs happens inside containers

The course evaluator runs `docker compose up` and a single `make test` on a fresh unzip, with no dependency installed outside containers. So `make test` runs every suite (unit, integration, E2E with the official Playwright image) through `docker compose`, and integration tests use a separate `ecommerce_test` database on the compose PostgreSQL service instead of Testcontainers, which would need the Docker socket inside the test container. Host-installed Node is only a developer convenience.

The E2E suite runs as its own compose project (`aigile-ecommerce-e2e`, from `docker-compose.yml` plus `docker-compose.e2e.yml`) with a fresh database volume and no host ports. Its tests replace the Products they need, so it must never share the development database. Because of that, the Playwright service is defined in the override file and not in `docker-compose.yml`.
