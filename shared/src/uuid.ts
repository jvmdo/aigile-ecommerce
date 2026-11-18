import { Type } from "@sinclair/typebox";

/**
 * An entity id (ADR 0006): exactly the 8-4-4-4-12 hexadecimal form. The pattern also rules out
 * forms the loose `uuid` format accepts but PostgreSQL rejects, such as `urn:uuid:…`, so they
 * are refused as `400` by the route schema instead of failing in the database (security
 * report, S4).
 */
export const Uuid = Type.String({
  format: "uuid",
  pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
});
