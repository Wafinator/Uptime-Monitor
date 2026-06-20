import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests live next to the code (e.g. src/services/checkService.test.mjs).
    include: ["src/**/*.test.mjs"],
    environment: "node",
    // Fresh module registry per test file so cached state (like a DB pool)
    // doesn't bleed between files.
    isolate: true,
    // Runs once before any worker. Spins up the test DB if it's missing.
    globalSetup: ["./test/globalSetup.mjs"],
    // Runs in each worker before tests. Points DATABASE_URL at the test DB.
    setupFiles: ["./test/setup.mjs"],
    // Integration tests do real DB I/O so the default 5s is too tight.
    testTimeout: 15000,
  },
});
