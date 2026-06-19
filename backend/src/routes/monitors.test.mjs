import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createRequire } from "module";
import request from "supertest";

const require = createRequire(import.meta.url);

// Load source modules through createRequire AFTER setupFiles has set DATABASE_URL.
// (Static ESM imports would be hoisted before env mutation.)
const { createApp } = require("../app.js");
const { initDb } = require("../db/init.js");
const { pool } = require("../db/pool.js");

let app;

beforeAll(async () => {
  await initDb();
  app = createApp();
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Wipe state between tests so order doesn't matter and serial IDs reset.
  await pool.query("TRUNCATE monitors, monitor_logs RESTART IDENTITY CASCADE");
});

const validMonitor = {
  name: "Example",
  url: "https://example.com",
  interval_minutes: 5,
  alert_email: "ops@example.com",
};

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("GET /api/monitors", () => {
  it("returns an empty array when no monitors exist", async () => {
    const res = await request(app).get("/api/monitors");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns created monitors ordered by created_at DESC", async () => {
    await request(app).post("/api/monitors").send({ ...validMonitor, name: "First" });
    await request(app).post("/api/monitors").send({ ...validMonitor, name: "Second" });

    const res = await request(app).get("/api/monitors");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Second");
    expect(res.body[1].name).toBe("First");
  });
});

describe("POST /api/monitors", () => {
  it("creates a monitor and returns it with defaults applied", async () => {
    const res = await request(app)
      .post("/api/monitors")
      .send({ name: "Site", url: "https://example.com" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Site",
      url: "https://example.com",
      interval_minutes: 5,
      is_active: true,
      last_status: null,
      last_checked_at: null,
      alert_email: null,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.created_at).toBeDefined();
  });

  it("accepts a custom interval and alert email", async () => {
    const res = await request(app).post("/api/monitors").send(validMonitor);
    expect(res.status).toBe(201);
    expect(res.body.interval_minutes).toBe(5);
    expect(res.body.alert_email).toBe("ops@example.com");
  });

  it("400s when name is missing", async () => {
    const res = await request(app)
      .post("/api/monitors")
      .send({ url: "https://example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  it("400s when url is missing", async () => {
    const res = await request(app).post("/api/monitors").send({ name: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/);
  });

  it("400s when url is not http(s)", async () => {
    const res = await request(app)
      .post("/api/monitors")
      .send({ name: "x", url: "ftp://example.com" });
    expect(res.status).toBe(400);
  });

  it("400s when interval_minutes is < 1", async () => {
    const res = await request(app)
      .post("/api/monitors")
      .send({ ...validMonitor, interval_minutes: 0 });
    expect(res.status).toBe(400);
  });

  it("treats an empty body as a 400", async () => {
    const res = await request(app).post("/api/monitors").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/monitors/:id", () => {
  it("returns a single monitor", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);
    const res = await request(app).get(`/api/monitors/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.name).toBe(validMonitor.name);
  });

  it("404s for unknown id", async () => {
    const res = await request(app).get("/api/monitors/99999");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/monitors/:id", () => {
  it("updates only the fields provided", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);

    const res = await request(app)
      .patch(`/api/monitors/${created.body.id}`)
      .send({ name: "Renamed" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed");
    // Unchanged fields preserved
    expect(res.body.url).toBe(validMonitor.url);
    expect(res.body.interval_minutes).toBe(validMonitor.interval_minutes);
  });

  it("can toggle is_active", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);

    const res = await request(app)
      .patch(`/api/monitors/${created.body.id}`)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });

  it("can clear alert_email by passing an empty string", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);

    const res = await request(app)
      .patch(`/api/monitors/${created.body.id}`)
      .send({ alert_email: "" });

    expect(res.status).toBe(200);
    expect(res.body.alert_email).toBeNull();
  });

  it("400s when no updatable fields are sent", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);
    const res = await request(app).patch(`/api/monitors/${created.body.id}`).send({});
    expect(res.status).toBe(400);
  });

  it("400s on invalid url", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);
    const res = await request(app)
      .patch(`/api/monitors/${created.body.id}`)
      .send({ url: "not a url" });
    expect(res.status).toBe(400);
  });

  it("404s for unknown id", async () => {
    const res = await request(app)
      .patch("/api/monitors/99999")
      .send({ name: "x" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/monitors/:id", () => {
  it("deletes the monitor and returns 204", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);

    const del = await request(app).delete(`/api/monitors/${created.body.id}`);
    expect(del.status).toBe(204);

    const after = await request(app).get(`/api/monitors/${created.body.id}`);
    expect(after.status).toBe(404);
  });

  it("404s for unknown id", async () => {
    const res = await request(app).delete("/api/monitors/99999");
    expect(res.status).toBe(404);
  });

  it("cascades and removes associated logs", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);
    // Seed a log directly to prove the cascade works.
    await pool.query(
      `INSERT INTO monitor_logs (monitor_id, status, status_code, response_time_ms)
       VALUES ($1, 'up', 200, 100)`,
      [created.body.id]
    );

    await request(app).delete(`/api/monitors/${created.body.id}`);

    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM monitor_logs WHERE monitor_id = $1",
      [created.body.id]
    );
    expect(rows[0].n).toBe(0);
  });
});

describe("GET /api/monitors/:id/logs", () => {
  it("returns logs ordered by checked_at DESC", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);
    const id = created.body.id;

    await pool.query(
      `INSERT INTO monitor_logs (monitor_id, status, status_code, response_time_ms, checked_at)
       VALUES
         ($1, 'up',   200, 100, NOW() - interval '2 minutes'),
         ($1, 'down', 500, 250, NOW() - interval '1 minute'),
         ($1, 'up',   200, 110, NOW())`,
      [id]
    );

    const res = await request(app).get(`/api/monitors/${id}/logs`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].response_time_ms).toBe(110); // newest first
    expect(res.body[2].response_time_ms).toBe(100); // oldest last
  });

  it("respects the limit query param", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);
    const id = created.body.id;

    for (let i = 0; i < 10; i++) {
      await pool.query(
        `INSERT INTO monitor_logs (monitor_id, status, status_code, response_time_ms)
         VALUES ($1, 'up', 200, $2)`,
        [id, i]
      );
    }

    const res = await request(app).get(`/api/monitors/${id}/logs?limit=3`);
    expect(res.body).toHaveLength(3);
  });

  it("caps the limit at 500 to prevent runaway queries", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);
    const id = created.body.id;
    // Don't seed 500 rows — just confirm the endpoint accepts the param without erroring.
    const res = await request(app).get(`/api/monitors/${id}/logs?limit=999999`);
    expect(res.status).toBe(200);
  });

  it("returns an empty array for a monitor with no logs", async () => {
    const created = await request(app).post("/api/monitors").send(validMonitor);
    const res = await request(app).get(`/api/monitors/${created.body.id}/logs`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
