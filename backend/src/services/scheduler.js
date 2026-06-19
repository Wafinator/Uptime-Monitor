const cron = require("node-cron");
const { pool } = require("../db/pool");
const { checkUrl } = require("./checkService");
const { sendDownAlert } = require("./alertService");

// Tick every minute. Each tick: find active monitors whose next-check time has arrived,
// run them concurrently, record results, and email alerts on up -> down transitions.
const CRON_EXPRESSION = "* * * * *";

// Hard cap on how many monitors we run per tick, so a flood of due monitors
// can't blow up our event loop or hammer the DB pool.
const MAX_CONCURRENT_CHECKS = 25;

async function findDueMonitors() {
  // "Due" = never checked yet, OR last_checked_at is older than interval_minutes ago.
  const { rows } = await pool.query(
    `SELECT *
     FROM monitors
     WHERE is_active = TRUE
       AND (
         last_checked_at IS NULL
         OR last_checked_at <= NOW() - (interval_minutes || ' minutes')::interval
       )
     ORDER BY last_checked_at NULLS FIRST
     LIMIT $1`,
    [MAX_CONCURRENT_CHECKS]
  );
  return rows;
}

async function runCheckForMonitor(monitor) {
  const result = await checkUrl(monitor.url);

  // Persist the log + update the monitor's last status in a single transaction
  // so the dashboard never shows a status that disagrees with the latest log.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO monitor_logs (monitor_id, status, status_code, response_time_ms)
       VALUES ($1, $2, $3, $4)`,
      [monitor.id, result.status, result.statusCode, result.responseTimeMs]
    );

    await client.query(
      `UPDATE monitors
       SET last_status = $1, last_checked_at = NOW()
       WHERE id = $2`,
      [result.status, monitor.id]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Alert only on a state transition into "down". This prevents one outage
  // from spamming the user every minute it stays down.
  const wasUp = monitor.last_status !== "down";
  if (result.status === "down" && wasUp) {
    await sendDownAlert(monitor, result);
  }

  return result;
}

async function tick() {
  let due;
  try {
    due = await findDueMonitors();
  } catch (err) {
    console.error("[scheduler] Failed to query due monitors:", err.message);
    return;
  }

  if (due.length === 0) return;

  console.log(`[scheduler] Running ${due.length} check(s).`);

  // Concurrent — one slow target shouldn't block the others.
  // Catch per-monitor so one failure doesn't drop the rest.
  await Promise.all(
    due.map((m) =>
      runCheckForMonitor(m).catch((err) => {
        console.error(`[scheduler] Check failed for monitor ${m.id} (${m.name}):`, err.message);
      })
    )
  );
}

let task = null;

function startScheduler() {
  if (task) return task;
  task = cron.schedule(CRON_EXPRESSION, tick);
  console.log("[scheduler] Started (runs every minute).");
  return task;
}

function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    console.log("[scheduler] Stopped.");
  }
}

module.exports = { startScheduler, stopScheduler, tick, runCheckForMonitor, findDueMonitors };
