// Runs ONCE before any test worker starts. Creates the test database if missing.
import pg from "pg";

const ADMIN_URL = process.env.TEST_ADMIN_URL || "postgres://uptime:uptime@localhost:5433/postgres";
const TEST_DB = process.env.TEST_DB_NAME || "uptime_test";

export default async function setup() {
  const client = new pg.Client({ connectionString: ADMIN_URL });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DB]);
    if (rows.length === 0) {
      // CREATE DATABASE doesn't accept parameters, so we have to interpolate.
      // TEST_DB is operator-controlled, not user input — safe to inline.
      await client.query(`CREATE DATABASE ${TEST_DB}`);
      console.log(`[test setup] Created database "${TEST_DB}".`);
    }
  } finally {
    await client.end();
  }
}
