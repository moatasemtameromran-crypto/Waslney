try { require('dotenv').config(); } catch(e) {}
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.MYSQL_HOST     || process.env.DB_PUBLIC_HOST || process.env.DB_HOST || 'localhost',
  user:               process.env.MYSQL_USER     || process.env.DB_USER        || 'root',
  password:           process.env.MYSQL_PASSWORD || process.env.DB_PASS        || '',
  database:           process.env.MYSQL_DATABASE || process.env.DB_NAME        || 'railway',
  port:               parseInt(process.env.MYSQL_PORT || process.env.DB_PORT)  || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
});

const dbName = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'railway';
pool.getConnection()
  .then(conn => {
    console.log(`✅  MySQL connected — database: ${dbName}`);
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
    console.error('    Host:', process.env.MYSQL_HOST || process.env.DB_PUBLIC_HOST || process.env.DB_HOST);
    console.error('    User:', process.env.MYSQL_USER || process.env.DB_USER);
    console.error('    DB:  ', dbName);
    process.exit(1);
  });

module.exports = pool;
