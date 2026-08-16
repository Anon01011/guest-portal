/**
 * seed.js - Guest Management App Data Seeder
 * Run: node seed.js
 * Inserts default admin credentials if they do not exist.
 */
require("dotenv").config();
const mysql = require("mysql2/promise");

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "guest_management_db",
  dateStrings: true
};

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log("Connected to database:", DB_CONFIG.database);

    // Ensure default admin user exists
    const [users] = await conn.query("SELECT id FROM users WHERE username = 'admin'");
    if (users.length === 0) {
      // bcrypt hash for 'admin123'
      const adminHash = '$2a$10$PvcuIq1w63JLeTEY8glOsuwKHbskido5P8zrrBNfRKVt.6mWRz4zW';
      await conn.query(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        ['admin', adminHash]
      );
      console.log("Default admin user created (username: admin, password: admin123).");
    } else {
      console.log("Admin user 'admin' already exists.");
    }
  } catch (err) {
    console.error("Seeder error:", err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
