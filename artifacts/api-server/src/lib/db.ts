import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env["DB_PUBLIC_HOST"] || process.env["DB_HOST"] || "localhost",
  user: process.env["DB_USER"] || "root",
  password: process.env["DB_PASS"] || "",
  database: process.env["DB_NAME"] || "waslney",
  port: Number(process.env["DB_PORT"] || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "+00:00",
  ssl: { rejectUnauthorized: false },
});

export default pool;
