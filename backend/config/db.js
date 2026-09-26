const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

// Compatibility helper for the existing routes.
// It allows code using pool.execute(sql, params)
// to continue working while we convert MySQL -> PostgreSQL.
pool.execute = async (sql, params = []) => {
  let index = 0;

  const postgresSql = sql
    .replace(/\?/g, () => `$${++index}`)
    .replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP");

  const result = await pool.query(postgresSql, params);

  return [result.rows, result.fields];
};

module.exports = pool;
