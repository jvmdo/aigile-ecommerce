# PostgreSQL as the database

The architecture leaves SQLite or PostgreSQL open. We chose PostgreSQL, running in its own container, because the architecture asks for a dedicated database container in `docker-compose.yml` (SQLite is a file, not a service), and because the stock-decrement strategy decided for the cart feature needs real row-level locking (`SELECT … FOR UPDATE`) to be meaningful.
