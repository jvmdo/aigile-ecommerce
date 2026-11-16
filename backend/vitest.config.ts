import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/support/global-setup.ts"],
    // Files share ecommerce_test, and the health test drops every connection to it.
    fileParallelism: false,
  },
});
