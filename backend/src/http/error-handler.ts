import type { ErrorEnvelope } from "@aigile/shared";
import type { FastifyError } from "fastify";
import type { App } from "../app.ts";

/** Builds a body in the shared error envelope (CODING_STANDARDS.md, "Errors"). */
export function errorBody(code: string, message: string, details?: unknown): ErrorEnvelope {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/**
 * Puts every error response in the shared error envelope: schema validation → 400, other
 * client errors raised by Fastify keep their 4xx status, anything else → 500. Messages are
 * fixed Portuguese text; no stack trace or underlying error message reaches the client.
 */
export function registerErrorHandlers(app: App): void {
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.validation) {
      const details = error.validation.map(({ instancePath, message }) => ({
        path: `${error.validationContext ?? ""}${instancePath}`,
        message,
      }));
      return reply
        .code(400)
        .send(errorBody("VALIDATION_ERROR", "A requisição é inválida.", details));
    }

    // Malformed requests Fastify rejects itself (invalid JSON, unsupported media type, ...).
    if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
      return reply
        .code(error.statusCode)
        .send(errorBody("BAD_REQUEST", "A requisição não pôde ser processada."));
    }

    request.log.error({ err: error }, "unexpected error");
    return reply.code(500).send(errorBody("INTERNAL_ERROR", "Erro interno do servidor."));
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send(errorBody("NOT_FOUND", "Recurso não encontrado.")),
  );
}
