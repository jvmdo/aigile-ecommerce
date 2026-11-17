import { DrizzleQueryError } from "drizzle-orm";

const UNIQUE_VIOLATION = "23505";

/**
 * Whether a failed query broke this unique constraint or index. drizzle wraps the driver's
 * error in a DrizzleQueryError, whose `cause` carries the Postgres code and constraint name.
 * A Repository uses it to turn a known violation into a typed result (CODING_STANDARDS).
 */
export function violatesUnique(error: unknown, constraint: string): boolean {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === UNIQUE_VIOLATION &&
    "constraint" in cause &&
    cause.constraint === constraint
  );
}
