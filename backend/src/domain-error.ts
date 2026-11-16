import type { DomainErrorCode } from "@aigile/shared";

/**
 * A business-rule violation raised by a Service. It knows nothing about HTTP: the error
 * handler maps the code to a status and sends the message (Portuguese, user-facing) and
 * details in the shared error envelope.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: unknown;

  constructor(code: DomainErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}
