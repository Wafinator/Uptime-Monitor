import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Look for tests next to the code, e.g. src/services/checkService.test.js.
    include: ["src/**/*.test.mjs"],
    environment: "node",
    // Each test file gets its own module registry so module-level state
    // (like a cached DB pool) can't bleed between files.
    isolate: true,
    // Runs once before any worker — creates the test DB if missing.
    globalSetup: ["./test/globalSetup.mjs"],
    // Runs in every worker before tests — sets DATABASE_URL to the test DB.
    setupFiles: ["./test/setup.mjs"],
    // Integration tests do real DB I/O; default 5s timeout is tight.
    testTimeout: 15000,
  },
});
