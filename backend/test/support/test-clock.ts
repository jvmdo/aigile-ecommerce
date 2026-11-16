import type { Clock } from "../../src/clock.ts";

/** A clock that stays at the instant the test sets, so time-based rules are deterministic. */
export type TestClock = Clock & {
  set: (instant: Date) => void;
};

export function createTestClock(start: Date): TestClock {
  let current = start;
  return {
    now: () => current,
    set: (instant) => {
      current = instant;
    },
  };
}
