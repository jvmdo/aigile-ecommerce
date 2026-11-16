import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
} from "fastify";
import type { Clock } from "./clock.ts";
import type { Config } from "./config.ts";
import type { Database } from "./db/connection.ts";
import { registerHealthRoutes } from "./health/health.controller.ts";
import { createHealthRepository } from "./health/health.repository.ts";
import { createHealthService } from "./health/health.service.ts";
import { registerErrorHandlers } from "./http/error-handler.ts";
import { registerProductRoutes } from "./products/products.controller.ts";
import { createProductsRepository } from "./products/products.repository.ts";
import { createProductsService } from "./products/products.service.ts";

/** The Fastify instance with the TypeBox type provider: route schemas from `shared` type the handlers. */
export type App = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export type AppDependencies = {
  db: Database;
  config: Pick<Config, "logLevel">;
  /** The current time for business rules (Coupon expiry, abandonment); tests pass a controllable one. */
  clock: Clock;
};

/** Builds the Fastify app from its dependencies without listening. Integration tests use this seam. */
export function buildApp({ db, config }: AppDependencies): App {
  const app = Fastify({
    logger: { level: config.logLevel },
  }).withTypeProvider<TypeBoxTypeProvider>();

  registerErrorHandlers(app);
  registerHealthRoutes(app, createHealthService(createHealthRepository(db)));
  registerProductRoutes(app, createProductsService(createProductsRepository(db)));

  return app;
}
