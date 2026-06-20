const { pool } = require("./pool");

// Runs the CREATE TABLE statements every time the app boots. They use
// IF NOT EXISTS so it's a no op once the tables are already there.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitors (
      id               SERIAL PRIMARY KEY,
      name             TEXT        NOT NULL,
      url              TEXT        NOT NULL,
      interval_minutes INTEGER     NOT NULL DEFAULT 5,
      alert_email      TEXT,                 -- where to send down alerts. null = don't send
      is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
      last_status      TEXT,                 -- 'up' or 'down' or null if never checked
      last_checked_at  TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitor_logs (
      id               SERIAL PRIMARY KEY,
      monitor_id       INTEGER     NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      status           TEXT        NOT NULL,
      status_code      INTEGER,                -- null when there was no HTTP response at all
      response_time_ms INTEGER,
      checked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Makes the "last 50 logs for this monitor" query fast.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_monitor_logs_monitor_checked
      ON monitor_logs (monitor_id, checked_at DESC);
  `);

  console.log("[db] Schema ready.");
}

module.exports = { initDb };
