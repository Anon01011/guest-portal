const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;

let pool;

async function initDB() {
  const connection = await mysql.createConnection({
    host: DB_HOST || '127.0.0.1',
    port: DB_PORT || 3306,
    user: DB_USER || 'root',
    password: DB_PASS || ''
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
  await connection.end();

  pool = mysql.createPool({
    host: DB_HOST || '127.0.0.1',
    port: DB_PORT || 3306,
    user: DB_USER || 'root',
    password: DB_PASS || '',
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      id_num VARCHAR(100) UNIQUE NOT NULL,
      doc_type VARCHAR(50) NOT NULL,
      nationality VARCHAR(100) NOT NULL,
      dob DATE NOT NULL,
      expiry_date DATE NOT NULL,
      phone VARCHAR(50) NULL,
      raw_data TEXT NULL,
      photo LONGTEXT NULL,
      checked_in TINYINT(1) DEFAULT 0,
      check_in_time VARCHAR(20) NULL,
      saved_date VARCHAR(20) NOT NULL,
      hidden TINYINT(1) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'ok',
      warning_date VARCHAR(20) NULL,
      warning_reason TEXT NULL,
      blocked_date VARCHAR(20) NULL,
      blocked_reason TEXT NULL,
      deleted TINYINT(1) DEFAULT 0,
      delete_reason TEXT NULL,
      deleted_at VARCHAR(30) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS status_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      guest_id INT NOT NULL,
      type VARCHAR(20) NOT NULL,
      reason TEXT NOT NULL,
      date VARCHAR(30) NOT NULL,
      by_user VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT NULL
    );
  `);

  const [usersRows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
  if (usersRows.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
    console.log('Seeded default admin user.');
  }

  // Safe Index Creator Helper for performance
  const addIndexSafe = async (tableName, indexName, columnsString) => {
    try {
      const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.statistics 
         WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1`,
        [DB_NAME, tableName, indexName]
      );
      if (rows.length === 0) {
        await pool.query(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` (${columnsString})`);
        console.log(`Database optimization: Created index ${indexName} on ${tableName}`);
      }
    } catch (err) {
      console.error(`Error checking/creating index ${indexName}:`, err.message);
    }
  };

  // Ensure soft-delete column "deleted" exists in guests table
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM guests LIKE 'deleted'");
    if (columns.length === 0) {
      await pool.query("ALTER TABLE guests ADD COLUMN deleted TINYINT(1) DEFAULT 0");
      console.log('Database schema update: Added soft-delete column "deleted" to guests table.');
    }
  } catch (err) {
    console.error('Error running soft-delete column schema check:', err.message);
  }

  // Ensure delete_reason column exists (stores reason given when soft-deleting)
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM guests LIKE 'delete_reason'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE guests ADD COLUMN delete_reason TEXT NULL");
      console.log('Database schema update: Added "delete_reason" column to guests table.');
    }
  } catch (err) {
    console.error('Error adding delete_reason column:', err.message);
  }

  // Ensure deleted_at column exists (timestamp of soft-delete)
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM guests LIKE 'deleted_at'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE guests ADD COLUMN deleted_at VARCHAR(30) NULL");
      console.log('Database schema update: Added "deleted_at" column to guests table.');
    }
  } catch (err) {
    console.error('Error adding deleted_at column:', err.message);
  }

  // Add indexes to improve lookup speed on large datasets (10,000s of guest records)
  await addIndexSafe('guests', 'idx_saved_date', '`saved_date`');
  await addIndexSafe('guests', 'idx_hidden', '`hidden`');
  await addIndexSafe('guests', 'idx_name', '`name`');
  await addIndexSafe('guests', 'idx_id_num', '`id_num`');
  await addIndexSafe('guests', 'idx_saved_date_deleted', '`saved_date`, `deleted`');
  await addIndexSafe('guests', 'idx_status_deleted', '`status`, `deleted`');
  await addIndexSafe('guests', 'idx_deleted', '`deleted`');

  const seedSetting = async (key, defaultValue) => {
    const [rows] = await pool.query('SELECT * FROM settings WHERE setting_key = ?', [key]);
    if (rows.length === 0) {
      await pool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, defaultValue]);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  await seedSetting('date_mode', 'auto');
  await seedSetting('manual_rollover_time', '00:00');
  await seedSetting('operational_date', todayStr);

  // Seed default deletion PIN code "1234" (bcrypt hashed)
  const hashedPin = bcrypt.hashSync('1234', 10);
  await seedSetting('delete_pin', hashedPin);
  await seedSetting('scanner_folder', 'C:\\ScannerOutput');
  await seedSetting('selected_scanner', '');

  console.log('Database initialized successfully.');
}

module.exports = {
  initDB,
  query: (sql, params) => pool.query(sql, params),
  getPool: () => pool
};
