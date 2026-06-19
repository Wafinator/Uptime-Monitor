const express = require("express");
const cors = require("cors");

const monitorsRouter = require("./routes/monitors");

// Pure app factory: configures Express and returns it.
// No DB init, no scheduler, no server.listen — those belong in the bootstrap.
// This separation is what makes Supertest integration tests possible.
function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/monitors", monitorsRouter);

  // Centralized error handler — controllers call next(err) and we respond here.
  app.use((err, _req, res, _next) => {
    console.error("[api] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
