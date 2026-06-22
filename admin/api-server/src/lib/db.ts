import mysql from "mysql2/promise";
import { logger } from "./logger";

function createPool() {
  // Option 1: Full connection URL
  // MYSQL_PUBLIC_URL = Railway public network URL (works from outside Railway)
  // DATABASE_URL / MYSQL_URL = fallback (internal Railway URL won't work from Replit)
  const url = process.env["MYSQL_PUBLIC_URL"] || process.env["DATABASE_URL"] || process.env["MYSQL_URL"];
  if (url) {
    logger.info("Using DATABASE_URL for MySQL connection");
    return mysql.createPool(url + "?waitForConnections=true&connectionLimit=10&timezone=%2B00%3A00");
  }

  // Option 2: Individual vars (Hostinger / any host)
  const host = process.env["DB_HOST"] || "localhost";
  const user = process.env["DB_USER"] || "root";
  const password = process.env["DB_PASS"] || "";
  const database = process.env["DB_NAME"] || "waslney";
  const port = parseInt(process.env["DB_PORT"] || "3306");

  logger.info({ host, user, database, port }, "Using individual DB vars for MySQL connection");

  return mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+00:00",
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

const pool = createPool();

pool
  .getConnection()
  .then((conn) => {
    logger.info("MySQL connected successfully");
    conn.release();
  })
  .catch((err) => {
    logger.error({ err: err.message }, "MySQL connection failed — check DB_HOST or DATABASE_URL");
  });

export default pool;
