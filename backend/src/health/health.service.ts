import type { HealthRepository } from "./health.repository.ts";

export type HealthService = {
  isDatabaseReachable: () => Promise<boolean>;
};

export function createHealthService(repository: HealthRepository): HealthService {
  return {
    isDatabaseReachable: async () => {
      try {
        await repository.ping();
        return true;
      } catch {
        return false;
      }
    },
  };
}
