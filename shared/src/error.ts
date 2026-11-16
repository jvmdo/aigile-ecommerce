import { type Static, Type } from "@sinclair/typebox";

/** The single error shape every API error response uses (CODING_STANDARDS.md, "Errors"). */
export const ErrorEnvelope = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Unknown()),
  }),
});

export type ErrorEnvelope = Static<typeof ErrorEnvelope>;
