// Fails when src/db/schema.ts has changes with no generated migration: runs `drizzle-kit
// generate` against a copy of migrations/ and checks that it writes no new file. Needs no
// database, so it runs in `npm run check` (and the pre-commit hook).
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const migrations = "migrations";
const copy = mkdtempSync(join(tmpdir(), "migration-drift-"));
try {
  cpSync(migrations, copy, { recursive: true });
  const before = new Set(readdirSync(copy));
  // drizzle-kit prefixes --out with "./", so it takes a path relative to this directory.
  execFileSync(
    "npx",
    [
      "drizzle-kit",
      "generate",
      "--dialect",
      "postgresql",
      "--schema",
      "./src/db/schema.ts",
      "--out",
      relative(process.cwd(), copy),
    ],
    { stdio: "pipe" },
  );
  const added = readdirSync(copy).filter((file) => !before.has(file));
  if (added.length > 0) {
    console.error(
      `src/db/schema.ts has changes with no migration (drizzle-kit would generate ${added.join(", ")}).\nRun \`npx drizzle-kit generate --name <what_changed>\` in backend/ and commit the migration.`,
    );
    process.exit(1);
  }
} finally {
  rmSync(copy, { recursive: true, force: true });
}
