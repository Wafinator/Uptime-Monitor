// Runs in each test worker before tests load. Points DATABASE_URL at the test DB
// so the pool module connects to a clean, isolated database.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://uptime:uptime@localhost:5433/uptime_test";
