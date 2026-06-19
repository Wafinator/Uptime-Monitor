const { pool } = require("./pool");

// Creates the tables if they don't already exist. Safe to run on every boot.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitors (
      id               SERIAL PRIMARY KEY,
      name             TEXT        NOT NULL,
      url              TEXT        NOT NULL,
      interval_minutes INTEGER     NOT NULL DEFAULT 5,
      alert_email      TEXT,                 -- recipient for down alerts; NULL = no email
      is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
      last_status      TEXT,                 -- 'up' | 'down' | NULL (never checked) - used for transition detection
      last_checked_at  TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitor_logs (
      id               SERIAL PRIMARY KEY,
      monitor_id       INTEGER     NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      status           TEXT        NOT NULL,   -- 'up' | 'down'
      status_code      INTEGER,                -- HTTP status, NULL on connection error/timeout
      response_time_ms INTEGER,
      checked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Speeds up the "last 50 logs for a monitor" query.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_monitor_logs_monitor_checked
      ON monitor_logs (monitor_id, checked_at DESC);
  `);

  console.log("[db] Schema ready.");
}

module.exports = { initDb };
