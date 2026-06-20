const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in."
  );
}

// One shared pool for the whole app. Way better than opening a new connection
// per query.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle client:", err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
