import { type Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const ConfigSchema = Type.Object({
  databaseUrl: Type.String({ pattern: "^postgres(ql)?://" }),
  host: Type.String({ minLength: 1 }),
  port: Type.Integer({ minimum: 1, maximum: 65535 }),
  logLevel: Type.Union(
    ["fatal", "error", "warn", "info", "debug", "trace", "silent"].map((level) =>
      Type.Literal(level),
    ),
  ),
});

export type Config = Static<typeof ConfigSchema>;

export class ConfigError extends Error {}

/** Reads and validates the config from environment variables; throws ConfigError listing every problem. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const candidate = {
    databaseUrl: env.DATABASE_URL,
    host: env.HOST ?? "0.0.0.0",
    port: env.PORT === undefined ? 8800 : Number(env.PORT),
    logLevel: env.LOG_LEVEL ?? "info",
  };

  const problems = [...Value.Errors(ConfigSchema, candidate)].map(
    (error) => `  ${envNameFor(error.path)}: ${error.message}`,
  );
  if (problems.length > 0) {
    throw new ConfigError(`Configuração inválida:\n${problems.join("\n")}`);
  }
  return candidate as Config;
}

const envNames: Record<string, string> = {
  "/databaseUrl": "DATABASE_URL",
  "/host": "HOST",
  "/port": "PORT",
  "/logLevel": "LOG_LEVEL",
};

function envNameFor(path: string): string {
  return envNames[path] ?? path;
}
