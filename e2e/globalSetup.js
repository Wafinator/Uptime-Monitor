// Runs once before any E2E test. Wipes the test DB so the suite starts clean.
import pg from "pg";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://uptime:uptime@localhost:5433/uptime_test";

export default async function globalSetup() {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  try {
    await client.connect();
    // The backend's initDb runs on boot, so tables exist by the time real
    // tests run. But on the very first run before the backend has booted
    // they might not, so swallow that case.
    try {
      await client.query("TRUNCATE monitors, monitor_logs RESTART IDENTITY CASCADE");
    } catch {
      // Tables don't exist yet, backend will create them in a sec.
    }
  } finally {
    await client.end();
  }
}
