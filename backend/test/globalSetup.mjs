// Runs once before any test worker starts. Creates the test DB if it doesn't
// already exist so tests have somewhere to connect.
import pg from "pg";

const ADMIN_URL = process.env.TEST_ADMIN_URL || "postgres://uptime:uptime@localhost:5433/postgres";
const TEST_DB = process.env.TEST_DB_NAME || "uptime_test";

export default async function setup() {
  const client = new pg.Client({ connectionString: ADMIN_URL });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DB]);
    if (rows.length === 0) {
      // CREATE DATABASE doesn't take params so we have to inline the name.
      // It's only ever set by us, not user input, so this is fine.
      await client.query(`CREATE DATABASE ${TEST_DB}`);
      console.log(`[test setup] Created database "${TEST_DB}".`);
    }
  } finally {
    await client.end();
  }
}
