import type { DomainErrorCode, ErrorEnvelope } from "@aigile/shared";
import type { FastifyError } from "fastify";
import type { App } from "../app.ts";
import { DomainError } from "../domain-error.ts";

/** HTTP status for each domain error code (FRD do Carrinho, "Erros de domínio"). */
const domainErrorStatus: Record<DomainErrorCode, 404 | 409 | 422> = {
  CART_NOT_FOUND: 404,
  CART_ITEM_NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  INVALID_CART_TRANSITION: 409,
  CART_EMPTY: 409,
  INSUFFICIENT_STOCK: 409,
  COUPON_ALREADY_USED: 409,
  QUANTITY_LIMIT_EXCEEDED: 422,
  COUPON_NOT_FOUND: 422,
  COUPON_EXPIRED: 422,
};

/** Builds a body in the shared error envelope (CODING_STANDARDS.md, "Errors"). */
export function errorBody(code: string, message: string, details?: unknown): ErrorEnvelope {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/**
 * Puts every error response in the shared error envelope: schema validation → 400, a domain
 * error → the status mapped from its code, other client errors raised by Fastify keep their
 * 4xx status, anything else (including a domain error code with no status) → 500. Messages are
 * fixed Portuguese text; no stack trace or underlying error message reaches the client.
 */
export function registerErrorHandlers(app: App): void {
  app.setErrorHandler<FastifyError | DomainError>((error, request, reply) => {
    if (error instanceof DomainError) {
      const status = Object.hasOwn(domainErrorStatus, error.code)
        ? domainErrorStatus[error.code]
        : undefined;
      if (status !== undefined) {
        return reply.code(status).send(errorBody(error.code, error.message, error.details));
      }
      request.log.error({ err: error }, "domain error code with no HTTP status");
      return reply.code(500).send(errorBody("INTERNAL_ERROR", "Erro interno do servidor."));
    }

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
