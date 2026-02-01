const mysql = require("mysql2");
require("dotenv").config();

const connection = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "healthhub",
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

connection.on('error', (err) => {
  console.error('MySQL Pool Error:', err);
});

connection.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Database Connection Error:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Connected to healthhub Database Successfully!");
    conn.release();
  }
});

module.exports = connection;