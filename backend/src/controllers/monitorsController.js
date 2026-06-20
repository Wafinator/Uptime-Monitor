const { pool } = require("../db/pool");

// Just a sanity check on the URL so we don't store obvious junk. The real
// test is whether the HTTP request actually goes through.
function isValidUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function listMonitors(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM monitors ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getMonitor(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM monitors WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Monitor not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function createMonitor(req, res, next) {
  try {
    const { name, url, interval_minutes, alert_email } = req.body ?? {};

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }
    if (!isValidUrl(url)) {
      return res.status(400).json({ error: "url must be a valid http(s) URL" });
    }

    const interval = Number.isInteger(interval_minutes) ? interval_minutes : 5;
    if (interval < 1) {
      return res.status(400).json({ error: "interval_minutes must be >= 1" });
    }

    const { rows } = await pool.query(
      `INSERT INTO monitors (name, url, interval_minutes, alert_email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, url, interval, alert_email || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateMonitor(req, res, next) {
  try {
    const { name, url, interval_minutes, alert_email, is_active } = req.body ?? {};

    // Only touch the fields the caller actually sent. Build the SQL dynamically.
    const fields = [];
    const values = [];
    let i = 1;

    if (name !== undefined) {
      if (typeof name !== "string" || !name) {
        return res.status(400).json({ error: "name must be a non-empty string" });
      }
      fields.push(`name = $${i++}`);
      values.push(name);
    }
    if (url !== undefined) {
      if (!isValidUrl(url)) {
        return res.status(400).json({ error: "url must be a valid http(s) URL" });
      }
      fields.push(`url = $${i++}`);
      values.push(url);
    }
    if (interval_minutes !== undefined) {
      if (!Number.isInteger(interval_minutes) || interval_minutes < 1) {
        return res.status(400).json({ error: "interval_minutes must be an integer >= 1" });
      }
      fields.push(`interval_minutes = $${i++}`);
      values.push(interval_minutes);
    }
    if (alert_email !== undefined) {
      fields.push(`alert_email = $${i++}`);
      values.push(alert_email || null);
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${i++}`);
      values.push(Boolean(is_active));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "no updatable fields provided" });
    }

    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE monitors SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: "Monitor not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteMonitor(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM monitors WHERE id = $1`,
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Monitor not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getMonitorLogs(req, res, next) {
  try {
    // Default 50 rows, hard cap at 500 so someone passing ?limit=999999
    // can't murder the query.
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const { rows } = await pool.query(
      `SELECT * FROM monitor_logs
       WHERE monitor_id = $1
       ORDER BY checked_at DESC
       LIMIT $2`,
      [req.params.id, limit]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMonitors,
  getMonitor,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  getMonitorLogs,
  isValidUrl,
};
