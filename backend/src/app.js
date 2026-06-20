const express = require("express");
const cors = require("cors");

const monitorsRouter = require("./routes/monitors");

// Builds the Express app and hands it back. No DB init, no scheduler,
// no listen call. Keeping those out of here is what lets the Supertest
// integration tests just import the app and hit it.
function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/monitors", monitorsRouter);

  // One error handler at the bottom so controllers can just next(err) and
  // not worry about the response shape.
  app.use((err, _req, res, _next) => {
    console.error("[api] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
