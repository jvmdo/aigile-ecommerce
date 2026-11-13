# Everything the evaluator runs happens inside containers

The course evaluator runs `docker compose up` and a single `make test` on a fresh unzip, with no dependency installed outside containers. So `make test` runs every suite (unit, integration, E2E with the official Playwright image) through `docker compose`, and integration tests use a separate `ecommerce_test` database on the compose PostgreSQL service instead of Testcontainers, which would need the Docker socket inside the test container. Host-installed Node is only a developer convenience.
