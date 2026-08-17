/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Locally, retries were 0 and workers was left to Playwright's default
  // (near CPU-core count) — with a single shared dev server, that many
  // concurrent browser contexts intermittently overload it and trip an
  // unrelated test's fixed-timeout assertion (confirmed: an 8-worker run
  // failed a different, unrelated theme spec each time; 4 workers ran
  // 42/42 clean twice in a row). Cap workers and add one local retry as
  // a safety net for whatever contention remains on a given machine.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm run dev -- --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
