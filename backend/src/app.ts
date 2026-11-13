import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "./config.ts";
import type { Database } from "./db/connection.ts";
import { registerHealthRoutes } from "./health/health.controller.ts";
import { createHealthRepository } from "./health/health.repository.ts";
import { createHealthService } from "./health/health.service.ts";

export type AppDependencies = {
  db: Database;
  config: Pick<Config, "logLevel">;
};

/** Builds the Fastify app from its dependencies without listening. Integration tests use this seam. */
export function buildApp({ db, config }: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: { level: config.logLevel } });

  registerHealthRoutes(app, createHealthService(createHealthRepository(db)));

  return app;
}
