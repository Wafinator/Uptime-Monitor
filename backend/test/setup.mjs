// Runs in each worker before tests load. Swaps DATABASE_URL to point at the
// test DB so the pool module connects somewhere clean.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://uptime:uptime@localhost:5433/uptime_test";
