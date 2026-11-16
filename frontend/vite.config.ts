import { defineConfig } from "vitest/config";

// The backend that `npm run dev` starts on the host. 127.0.0.1, not localhost, which
// Node may resolve to ::1 while the backend listens on IPv4.
const apiTarget = "http://127.0.0.1:8800";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    // Same paths as nginx in production: forwarded as they are, nothing rewritten.
    proxy: {
      "/api": apiTarget,
      "/health": apiTarget,
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
