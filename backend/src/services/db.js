const fs = require("fs");
const { Pool, types } = require("pg");

// Return values the way the frontend already expects them: DATE as
// "YYYY-MM-DD" (not a local-midnight Date) and BIGINT on-chain ids as numbers.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(20, (v) => Number(v));

/*
 * Aiven PostgreSQL connection. DATABASE_URL is the Service URI from the
 * Aiven console. Aiven requires TLS; with DATABASE_CA_CERT pointing at the
 * service's ca.pem the server certificate is verified too.
 */
const caPath = process.env.DATABASE_CA_CERT;
if (!caPath) console.warn("DATABASE_CA_CERT not set: TLS is on, but the server certificate is not verified");

const pool = new Pool({
  // pg lets sslmode in the URL override the ssl option below, so drop it.
  connectionString: (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/, ""),
  ssl: caPath ? { ca: fs.readFileSync(caPath, "utf8") } : { rejectUnauthorized: false },
});

/** Run a query and return its rows. */
async function query(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

/** Run a query and return its first row, or null. */
async function one(text, params) {
  return (await query(text, params))[0] || null;
}

module.exports = { pool, query, one };
