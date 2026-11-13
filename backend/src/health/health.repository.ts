import { sql } from "drizzle-orm";
import type { Database } from "../db/connection.ts";

export type HealthRepository = {
  ping: () => Promise<void>;
};

export function createHealthRepository(db: Database): HealthRepository {
  return {
    ping: async () => {
      await db.execute(sql`SELECT 1`);
    },
  };
}
