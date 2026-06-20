// Runs ONCE before any E2E test. Ensures the test DB is empty so tests start clean.
import pg from "pg";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://uptime:uptime@localhost:5433/uptime_test";

export default async function globalSetup() {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  try {
    await client.connect();
    // Tables exist because the backend's initDb() runs on startup.
    // But on the very first run before the backend has booted, they might not.
    // Truncate inside a try so the first-run case doesn't blow up.
    try {
      await client.query("TRUNCATE monitors, monitor_logs RESTART IDENTITY CASCADE");
    } catch {
      // Tables don't exist yet — backend will create them shortly.
    }
  } finally {
    await client.end();
  }
}
