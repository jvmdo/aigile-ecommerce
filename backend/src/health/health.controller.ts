import type { FastifyInstance } from "fastify";
import type { HealthService } from "./health.service.ts";

export function registerHealthRoutes(app: FastifyInstance, service: HealthService): void {
  app.get("/health", async (_request, reply) => {
    if (await service.isDatabaseReachable()) {
      return reply.code(200).send({ status: "ok" });
    }
    return reply.code(503).send({
      error: { code: "DATABASE_UNAVAILABLE", message: "O banco de dados está inacessível." },
    });
  });
}
