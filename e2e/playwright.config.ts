import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  // Test files share the e2e database, so they run one at a time.
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    // The frontend through nginx, as the buyer sees it (the `web` compose service).
    baseURL: process.env.E2E_BASE_URL ?? "http://web:8080",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
