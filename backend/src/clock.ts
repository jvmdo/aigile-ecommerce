/** The source of the current time, passed in when the app is built so tests can control it. */
export type Clock = {
  now(): Date;
};

export const systemClock: Clock = {
  now: () => new Date(),
};
