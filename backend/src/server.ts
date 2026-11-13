import { buildApp } from "./app.ts";
import { type Config, ConfigError, loadConfig } from "./config.ts";
import { createDatabase } from "./db/connection.ts";

let config: Config;
try {
  config = loadConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

const database = createDatabase(config.databaseUrl, {
  onIdleConnectionError: (error) => app.log.warn({ err: error }, "idle database connection lost"),
});
const app = buildApp({ db: database.db, config });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await app.close();
    await database.close();
    process.exit(0);
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  await database.close();
  process.exit(1);
}
