const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')
const log = require('electron-log')

// Database will be saved in user's app data folder
// Windows: C:\Users\YourName\AppData\Roaming\weighbridge-app\
const DB_PATH = path.join(app.getPath('userData'), 'weighbridge.db')

let db

function getDatabase() {
  if (!db) {
    try {
      db = new Database(DB_PATH)
      db.pragma('journal_mode = WAL')  // Better performance
      db.pragma('foreign_keys = ON')   // Data integrity
      log.info('Database connected:', DB_PATH)
      runMigrations(db)
      initializeTables()
    } catch (error) {
      log.error('Database connection failed:', error)
      throw error
    }
  }
  return db
}
function runMigrations(db) {
  // Each migration is safe to run multiple times
  // Add new migrations here as app grows
  const migrations = [
    `ALTER TABLE tickets  ADD COLUMN vehicle_owner TEXT`,
    `ALTER TABLE users    ADD COLUMN last_login DATETIME`,
    `ALTER TABLE vehicles ADD COLUMN standard_tare REAL DEFAULT 0`,
    `ALTER TABLE tickets  ADD COLUMN status TEXT DEFAULT 'pending'`,
    `ALTER TABLE users    ADD COLUMN pin TEXT`,
    `ALTER TABLE users    ADD COLUMN full_name TEXT`,
  ]

  migrations.forEach(sql => {
    try {
      db.exec(sql)
      log.info('Migration applied:', sql)
    } catch (e) {
      // Already exists — skip silently
    }
  })

  log.info('Migrations complete')
}
function initializeTables() {
  const database = db

  // Settings table — company info, branding
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Vehicles table
  database.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_no TEXT UNIQUE NOT NULL,
      owner_name TEXT,
      vehicle_type TEXT DEFAULT 'Truck',
      standard_tare REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Materials table
  database.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      rate_per_ton REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Suppliers table
  database.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      address TEXT,
      contact TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Receivers table
  database.exec(`
    CREATE TABLE IF NOT EXISTS receivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      address TEXT,
      contact TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Users table — operator, admin, superadmin
  database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    pin TEXT,
    role TEXT DEFAULT 'operator',
    full_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

  // Tickets table — main data table
  database.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_no INTEGER UNIQUE NOT NULL,
      vehicle_id INTEGER,
      vehicle_no TEXT,
      material_id INTEGER,
      material_name TEXT,
      supplier_id INTEGER,
      supplier_name TEXT,
      receiver_id INTEGER,
      receiver_name TEXT,
      gross_weight REAL,
      gross_date TEXT,
      gross_time TEXT,
      tare_weight REAL,
      tare_date TEXT,
      tare_time TEXT,
      net_weight REAL,
      rate_per_ton REAL DEFAULT 0,
      charges REAL DEFAULT 0,
      royalty_no TEXT,
      transporter TEXT,
      vehicle_type TEXT,
      remarks TEXT,
      status TEXT DEFAULT 'pending',
      is_synced INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `)

  // Audit log — track every action
  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      table_name TEXT,
      record_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Insert default settings if not exist
  const insertSetting = database.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `)

  const defaults = [
    ['company_name', 'Your Company Name'],
    ['company_address', 'Your Address'],
    ['company_contact', ''],
    ['company_city', ''],
    ['company_logo', ''],
    ['ticket_next_no', '1'],
    ['ticket_copies', '3'],
    ['ticket_footer', 'Please check weight. No responsibility accepted once carrier leaves.'],
    ['paper_size', '80mm'],
    ['app_theme_color', '#e94560'],
    ['app_title', 'Weighbridge Management System'],
    ['eod_email', ''],
    ['eod_enabled', 'false'],
    ['eod_time', '20:00'],
    ['printer_name', ''],
    ['com_port', 'COM1'],
    ['baud_rate', '2400'],
    ['developer_name', 'Shabbir Yahya ✅'],
    ['developer_phone', '+91 9574713452'],
    ['developer_email', 'shabbir@saifenterprise.com'],
    ['developer_website', 'https://saifenterprise.com'],
    ['charges_type', 'per_ton'],
    ['charges_rate', '0'],
    ['print_mode', 'full'],
    ['print_copies', '3'],
    ['print_paper', '80mm'],
    ['print_show_supplier', 'true'],
    ['print_show_receiver', 'true'],
    ['print_show_royalty', 'false'],
    ['print_show_transporter', 'false'],
    ['print_show_remarks', 'false'],
    ['print_show_charges', 'true'],
    ['print_show_vehicle_type', 'true'],
    ['print_font_size', '11'],
    ['license_plan', 'basic'],
    ['license_client', ''],
  ]

  defaults.forEach(([key, value]) => insertSetting.run(key, value))

  // Insert default admin user if not exists
  // Default users — superadmin password generated on first run
  const crypto = require('crypto')
  const os = require('os')
  const hostname = os.hostname()
  // Fixed year so password never changes year to year
  const hash = crypto
    .createHash('sha256')
    .update(hostname + 'WBDEV2026SECRET')
    .digest('hex')
    .slice(0, 8)
    .toUpperCase()
  const devPassword = `WB-${hash}`

  const insertUser = database.prepare(`
  INSERT OR IGNORE INTO users (username, password, pin, role, full_name)
  VALUES (?, ?, ?, ?, ?)
`)
  // Superadmin — strong unique password, no PIN
  insertUser.run('superadmin', devPassword, null, 'superadmin', 'Developer')
  // Admin — client owner
  insertUser.run('admin', 'admin123', '1111', 'admin', 'Admin')
  // Operator — daily staff
  insertUser.run('operator', 'op123', '2222', 'operator', 'Operator')

  log.info('Default superadmin password:', devPassword)

  log.info('Database tables initialized')
}

module.exports = { getDatabase }