import type { ErrorEnvelope } from "@aigile/shared";

/**
 * The API answered with a non-2xx status, or could not be reached at all (`status` and
 * `code` are then undefined). `code` is the error envelope's code; the message is a
 * diagnostic, not shown to the Shopper (Domain's `errorMessage` turns the code into text).
 */
export class ApiError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;

  constructor(message: string, options: { status?: number; code?: string; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.status = options.status;
    this.code = options.code;
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
    throw new ApiError(`The API responded ${response.status}.`, {
      status: response.status,
      code: await readErrorCode(response),
    });
  }
  return (await response.json()) as T;
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const envelope = (await response.json()) as Partial<ErrorEnvelope>;
    return envelope.error?.code;
  } catch {
    return undefined;
  }
}
