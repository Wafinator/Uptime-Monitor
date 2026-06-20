require("dotenv").config();

const { createApp } = require("./app");
const { initDb } = require("./db/init");
const { pool } = require("./db/pool");
const { startScheduler, stopScheduler } = require("./services/scheduler");

const PORT = parseInt(process.env.PORT, 10) || 4000;

async function main() {
  await initDb();

  // E2E tests set DISABLE_SCHEDULER=1 so real HTTP checks don't fire during
  // UI assertions. Production and dev leave it unset.
  if (process.env.DISABLE_SCHEDULER !== "1") {
    startScheduler();
  } else {
    console.log("[api] Scheduler disabled (DISABLE_SCHEDULER=1).");
  }

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`[api] Listening on http://localhost:${PORT}`);
  });

  // Graceful shutdown so cron + DB pool actually close on Ctrl+C.
  const shutdown = async (signal) => {
    console.log(`[api] Received ${signal}, shutting down...`);
    stopScheduler();
    server.close(() => console.log("[api] HTTP server closed."));
    try {
      await pool.end();
      console.log("[api] DB pool closed.");
    } catch (err) {
      console.error("[api] Error closing DB pool:", err.message);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[api] Fatal startup error:", err);
  process.exit(1);
});
