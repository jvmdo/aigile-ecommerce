import { type NodePgDatabase, drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

export type Database = NodePgDatabase;

export type DatabaseConnection = {
  db: Database;
  close: () => Promise<void>;
};

export type DatabaseOptions = {
  /** Called when an idle pooled connection fails (e.g. the database restarted). */
  onIdleConnectionError?: (error: Error) => void;
};

export function createDatabase(
  connectionString: string,
  { onIdleConnectionError = () => {} }: DatabaseOptions = {},
): DatabaseConnection {
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 2000 });
  // Without a listener, an idle connection dropped by the server crashes the process.
  // The pool already discards the broken connection and opens a new one on demand.
  pool.on("error", onIdleConnectionError);
  return {
    db: drizzle(pool),
    close: () => pool.end(),
  };
}
