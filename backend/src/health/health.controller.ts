import { ErrorEnvelope, HealthResponse } from "@aigile/shared";
import type { App } from "../app.ts";
import { errorBody } from "../http/error-handler.ts";
import type { HealthService } from "./health.service.ts";

export function registerHealthRoutes(app: App, service: HealthService): void {
  app.get(
    "/health",
    { schema: { response: { 200: HealthResponse, 503: ErrorEnvelope } } },
    async (_request, reply) => {
      if (await service.isDatabaseReachable()) {
        return reply.code(200).send({ status: "ok" });
      }
      return reply
        .code(503)
        .send(errorBody("DATABASE_UNAVAILABLE", "O banco de dados está inacessível."));
    },
  );
}
