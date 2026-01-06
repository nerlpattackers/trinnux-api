import mysql from "mysql2/promise";

/**
 * Railway MySQL environment variables:
 *
 * MYSQLHOST
 * MYSQLPORT
 * MYSQLUSER
 * MYSQLPASSWORD
 * MYSQLDATABASE
 */

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: Number(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// Optional: connection test (safe for production)
pool
  .getConnection()
  .then((conn) => {
    console.log("✅ MySQL connected successfully");
    conn.release();
  })
  .catch((err) => {
    console.error("❌ MySQL connection failed:", err.message);
  });

export default pool;
