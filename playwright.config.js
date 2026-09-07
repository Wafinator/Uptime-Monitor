import { defineConfig, devices } from "@playwright/test";

// E2E config.
//   The BACKEND runs on 4001 pointing at uptime_test with cron disabled.
//   The FRONTEND runs on 3001 with its proxy pointed at the test backend.
//   Tests hit http://localhost:3001 like a real user would.
//
// Different ports from dev (4000/3000) so I can run the E2E suite while my
// dev servers are still up. No port conflicts, no shared DB state.

const TEST_BACKEND_PORT = 4001;
const TEST_FRONTEND_PORT = 3001;
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://uptime:uptime@localhost:5433/uptime_test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share one DB so serial keeps state predictable
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  globalSetup: "./e2e/globalSetup.js",

  use: {
    baseURL: `http://localhost:${TEST_FRONTEND_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      name: "backend",
      cwd: "./backend",
      command: "npm start",
      port: TEST_BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PORT: String(TEST_BACKEND_PORT),
        DATABASE_URL: TEST_DATABASE_URL,
        DISABLE_SCHEDULER: "1",
      },
    },
    {
      name: "frontend",
      cwd: "./frontend",
      command: `npm run dev -- --port ${TEST_FRONTEND_PORT} --strictPort`,
      port: TEST_FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        VITE_API_TARGET: `http://localhost:${TEST_BACKEND_PORT}`,
      },
    },
  ],
});
