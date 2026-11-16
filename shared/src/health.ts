import { type Static, Type } from "@sinclair/typebox";

export const HealthResponse = Type.Object({
  status: Type.Literal("ok"),
});

export type HealthResponse = Static<typeof HealthResponse>;
