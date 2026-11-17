import type { ErrorEnvelope } from "@aigile/shared";

/**
 * The API answered with a non-2xx status, or could not be reached at all (`status` and
 * `code` are then undefined). `code` and `details` are the error envelope's; the message is a
 * diagnostic, not shown to the Shopper (Domain's `errorMessage` turns the code into text).
 */
export class ApiError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly details: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string; details?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

/** Sends a request with an optional JSON body and returns the parsed JSON response, or throws ApiError. */
export async function requestJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError("The API could not be reached.", { cause });
  }
  if (!response.ok) {
    const error = await readError(response);
    throw new ApiError(`The API responded ${response.status}.`, {
      status: response.status,
      code: error?.code,
      details: error?.details,
    });
  }
  return (await response.json()) as T;
}

async function readError(response: Response): Promise<ErrorEnvelope["error"] | undefined> {
  try {
    const envelope = (await response.json()) as Partial<ErrorEnvelope>;
    return envelope.error;
  } catch {
    return undefined;
  }
}
