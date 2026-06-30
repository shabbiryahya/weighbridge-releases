const { getConfig } = require('./config')
require('dotenv').config()
const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const log = require('electron-log')
const MDBReaderModule = require('mdb-reader')
const MDBReader = MDBReaderModule.default || MDBReaderModule
const { SERVER_URL } = require('./config')
const { autoUpdater } = require('electron-updater')
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

const isDev = process.env.NODE_ENV === 'development'
let mainWindow
let serialPort = null
let serialParser = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Weighbridge Management System',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    show: false
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()

  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'client', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    log.info('App started')
  })
}

// ── SERIAL PORT ──────────────────────────────────────────────────────────────

function startSerialPort(portPath, baudRate) {
  try {
    if (serialPort?.isOpen) serialPort.close()

    serialPort = new SerialPort({
      path: portPath,
      baudRate: parseInt(baudRate) || 2400,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      autoOpen: true,
    })

    serialParser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))

    serialParser.on('data', (line) => {
      const raw = line.trim()
      // Try to extract number from line
      // Handles formats: "23450", "  23450  ", "ST,GS,+023450KG", "+023450"
      const match = raw.replace(/[^0-9.]/g, '')
      const weight = parseFloat(match)
      if (!isNaN(weight) && weight >= 0) {
        if (mainWindow) {
          mainWindow.webContents.send('serial:weight', weight)
        }
      }
    })

    serialPort.on('error', (err) => {
      log.error('Serial port error:', err.message)
      if (mainWindow) mainWindow.webContents.send('serial:error', err.message)
    })

    serialPort.on('open', () => {
      log.info(`Serial port opened: ${portPath} @ ${baudRate} baud`)
      if (mainWindow) mainWindow.webContents.send('serial:status', 'connected')
    })

    serialPort.on('close', () => {
      log.info('Serial port closed')
      if (mainWindow) mainWindow.webContents.send('serial:status', 'disconnected')
    })

  } catch (err) {
    log.error('Failed to open serial port:', err.message)
  }
}

// IPC handlers for serial port
ipcMain.handle('serial:start', async () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const portPath = db.prepare("SELECT value FROM settings WHERE key = 'com_port'").get()?.value || 'COM1'
  const baudRate = db.prepare("SELECT value FROM settings WHERE key = 'baud_rate'").get()?.value || '2400'
  startSerialPort(portPath, baudRate)
  return { success: true }
})

ipcMain.handle('serial:stop', () => {
  if (serialPort?.isOpen) {
    serialPort.close()
  }
  return { success: true }
})

ipcMain.handle('serial:list', async () => {
  const ports = await SerialPort.list()
  return ports
})

// Remove default menu (hides dev tools link and default help)

Menu.setApplicationMenu(null)

// ── Start app ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Migrate data from any previous app name folder to current "saifteq-weighbridge" folder
  try {
    const fs = require('fs')
    const newPath = app.getPath('userData')
    if (!fs.existsSync(newPath)) {
      for (const oldName of ['SaifTeq-Weighbridge-App', 'SaifTeq', 'Saif Enterprises', 'weighbridge-app']) {
        const oldPath = path.join(app.getPath('appData'), oldName)
        if (fs.existsSync(oldPath)) {
          fs.cpSync(oldPath, newPath, { recursive: true })
          log.info(`Migrated data from ${oldName} to saifteq-weighbridge`)
          break
        }
      }
    }
  } catch (e) {
    log.warn('Data migration skipped:', e.message)
  }

  try {
    Menu.setApplicationMenu(null)
    const { getDatabase } = require('./database')
    getDatabase()
    log.info('Database ready')
  } catch (error) {
    log.error('Database init failed:', error)
  }
  createWindow()
  // mainWindow.webContents.openDevTools()

  // Auto-start serial port when app is ready
  setTimeout(() => startSerialPort('COM1', '2400'), 3000)

  if (isDev) {
    const { globalShortcut } = require('electron')
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (mainWindow) mainWindow.webContents.toggleDevTools()
    })
  }

  // ── Auto Updater ──────────────────────────────────
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify()
    }, 5000)

    autoUpdater.on('update-available', () => {
      log.info('Update available — downloading...')
      if (mainWindow) {
        mainWindow.webContents.send('update:available')
      }
    })

    autoUpdater.on('update-downloaded', () => {
      log.info('Update downloaded — ready to install')
      if (mainWindow) {
        mainWindow.webContents.send('update:downloaded')
      }
    })

    autoUpdater.on('error', (err) => {
      log.error('Auto updater error:', err.message)
    })
  }

  // Install update when user clicks
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  const { globalShortcut } = require('electron')
  globalShortcut.unregisterAll()
})

// ── SETTINGS ─────────────────────────────────────────────────────────────────

ipcMain.handle('settings:getAll', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM settings').all()
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value
    return acc
  }, {})
})

ipcMain.handle('settings:get', (event, key) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row?.value || null
})

ipcMain.handle('settings:update', (event, key, value) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).run(key, value)
  return { success: true }
})

// ── TICKETS ──────────────────────────────────────────────────────────────────

ipcMain.handle('tickets:nextNo', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'ticket_next_no'").get()
  return parseInt(row?.value || '1')
})

ipcMain.handle('tickets:getRecent', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM tickets
    ORDER BY created_at DESC
    LIMIT 50
  `).all()
})

ipcMain.handle('tickets:getPending', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM tickets
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `).all()
})

ipcMain.handle('tickets:getById', (event, id) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id)
})

ipcMain.handle('tickets:getByNo', (event, ticketNo) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare('SELECT * FROM tickets WHERE ticket_no = ?').get(ticketNo)
})

ipcMain.handle('tickets:getLastByVehicle', (event, vehicleNo) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM tickets
    WHERE vehicle_no = ? AND status = 'complete'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(vehicleNo)
})

ipcMain.handle('tickets:getAll', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare(`
    SELECT ticket_no, vehicle_no, material_name, status
    FROM tickets
    ORDER BY ticket_no DESC
    LIMIT 100
  `).all()
})

ipcMain.handle('tickets:delete', (event, id) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  db.prepare('DELETE FROM tickets WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('tickets:save', (event, ticketData) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  try {
    // Determine status
    const hasGross = ticketData.gross_weight && ticketData.gross_weight > 0
    const hasTare = ticketData.tare_weight && ticketData.tare_weight > 0
    const status = hasGross && hasTare ? 'complete' : 'pending'
    ticketData.status = status

    // Calculate net if both present
    if (hasGross && hasTare) {
      ticketData.net_weight = Math.abs(ticketData.gross_weight - ticketData.tare_weight)
      if (ticketData.rate_per_ton && ticketData.net_weight) {
        ticketData.charges = ((ticketData.net_weight / 1000) * ticketData.rate_per_ton).toFixed(2)
      }
    }

    // UPDATE existing ticket
    if (ticketData.id) {
      db.prepare(`
        UPDATE tickets SET
          vehicle_no    = @vehicle_no,
          vehicle_type  = @vehicle_type,
          material_name = @material_name,
          supplier_name = @supplier_name,
          receiver_name = @receiver_name,
          gross_weight  = @gross_weight,
          gross_date    = @gross_date,
          gross_time    = @gross_time,
          tare_weight   = @tare_weight,
          tare_date     = @tare_date,
          tare_time     = @tare_time,
          net_weight    = @net_weight,
          rate_per_ton  = @rate_per_ton,
          charges       = @charges,
          royalty_no    = @royalty_no,
          transporter   = @transporter,
          remarks       = @remarks,
          status        = @status
        WHERE id = @id
      `).run(ticketData)
      return { success: true, id: ticketData.id, status }
    }

    // INSERT new ticket
    const result = db.prepare(`
      INSERT INTO tickets (
        ticket_no, vehicle_no, vehicle_type,
        material_name, supplier_name, receiver_name,
        gross_weight, gross_date, gross_time,
        tare_weight, tare_date, tare_time,
        net_weight, rate_per_ton, charges,
        royalty_no, transporter, remarks, status
      ) VALUES (
        @ticket_no, @vehicle_no, @vehicle_type,
        @material_name, @supplier_name, @receiver_name,
        @gross_weight, @gross_date, @gross_time,
        @tare_weight, @tare_date, @tare_time,
        @net_weight, @rate_per_ton, @charges,
        @royalty_no, @transporter, @remarks, @status
      )
    `).run(ticketData)

    // Increment ticket number only for new tickets
    db.prepare(`
      UPDATE settings SET value = value + 1
      WHERE key = 'ticket_next_no'
    `).run()

    return { success: true, id: result.lastInsertRowid, status }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ── VEHICLES ─────────────────────────────────────────────────────────────────

ipcMain.handle('vehicles:getAll', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare('SELECT * FROM vehicles WHERE is_active = 1 ORDER BY vehicle_no').all()
})

ipcMain.handle('vehicles:getAllNos', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare('SELECT vehicle_no FROM vehicles ORDER BY created_at DESC').all().map(r => r.vehicle_no)
})

ipcMain.handle('vehicles:getByNo', (event, vehicleNo) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare('SELECT * FROM vehicles WHERE vehicle_no = ?').get(vehicleNo)
})

ipcMain.handle('vehicles:autoSave', (event, vehicleNo, vehicleType) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  db.prepare(`
    INSERT OR IGNORE INTO vehicles (vehicle_no, vehicle_type)
    VALUES (?, ?)
  `).run(vehicleNo, vehicleType)
  return { success: true }
})

ipcMain.handle('vehicles:updateTare', (event, vehicleNo, tare) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  db.prepare(`
    UPDATE vehicles SET standard_tare = ? WHERE vehicle_no = ?
  `).run(tare, vehicleNo)
  return { success: true }
})

ipcMain.handle('vehicles:getAllWithLastTrip', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare(`
    SELECT v.vehicle_no, v.standard_tare,
           t.material_name as last_material,
           t.gross_date as last_date
    FROM vehicles v
    LEFT JOIN tickets t ON t.id = (
      SELECT id FROM tickets
      WHERE vehicle_no = v.vehicle_no
      AND status = 'complete'
      ORDER BY created_at DESC LIMIT 1
    )
    WHERE v.is_active = 1
    ORDER BY v.vehicle_no
  `).all()
})

// ── MATERIALS ────────────────────────────────────────────────────────────────

ipcMain.handle('materials:getAll', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare('SELECT * FROM materials WHERE is_active = 1 ORDER BY name').all()
})

ipcMain.handle('materials:add', (event, data) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  try {
    db.prepare('INSERT INTO materials (name, rate_per_ton) VALUES (?, ?)').run(data.name, data.rate_per_ton || 0)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ── SUPPLIERS ────────────────────────────────────────────────────────────────

ipcMain.handle('suppliers:getAll', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name').all()
})

ipcMain.handle('suppliers:add', (event, data) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  try {
    db.prepare('INSERT INTO suppliers (name, address, contact) VALUES (?, ?, ?)').run(data.name, data.address || '', data.contact || '')
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ── RECEIVERS ────────────────────────────────────────────────────────────────

ipcMain.handle('receivers:getAll', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare('SELECT * FROM receivers WHERE is_active = 1 ORDER BY name').all()
})

ipcMain.handle('receivers:add', (event, data) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  try {
    db.prepare('INSERT INTO receivers (name, address, contact) VALUES (?, ?, ?)').run(data.name, data.address || '', data.contact || '')
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ── MASTERS ──────────────────────────────────────────────────────────────────

ipcMain.handle('masters:delete', (event, table, id) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const allowed = ['materials', 'suppliers', 'receivers', 'vehicles']
  if (!allowed.includes(table)) return { success: false }
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
  return { success: true }
})

// ── REPORTS ──────────────────────────────────────────────────────────────────

ipcMain.handle('reports:daily', (event, date) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM tickets
    WHERE gross_date = ? OR tare_date = ?
    ORDER BY ticket_no DESC
  `).all(date, date)
})

ipcMain.handle('reports:monthly', (event, year, month) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM tickets
    WHERE strftime('%Y', created_at) = ?
    AND strftime('%m', created_at) = ?
    ORDER BY ticket_no DESC
  `).all(year, month)
})

ipcMain.handle('reports:summary', (event, date) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare(`
    SELECT
      COUNT(*) as total_tickets,
      SUM(net_weight) as total_net,
      SUM(gross_weight) as total_gross,
      SUM(charges) as total_charges
    FROM tickets
    WHERE gross_date = ? OR tare_date = ?
  `).get(date, date)
})

ipcMain.handle('reports:search', (event, query) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const q = `%${query}%`
  return db.prepare(`
    SELECT * FROM tickets
    WHERE vehicle_no LIKE ?
    OR material_name LIKE ?
    OR supplier_name LIKE ?
    OR receiver_name LIKE ?
    OR ticket_no LIKE ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(q, q, q, q, q)
})

ipcMain.handle('reports:all', (event, page = 1, limit = 20) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const offset = (page - 1) * limit
  const tickets = db.prepare(`
    SELECT * FROM tickets
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset)
  const total = db.prepare('SELECT COUNT(*) as count FROM tickets').get()
  return { tickets, total: total.count }
})

// Get all settings (already exists — skip)
// Update setting (already exists — skip)

// Save company logo (base64)
ipcMain.handle('settings:saveLogo', (event, base64) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('company_logo', ?, CURRENT_TIMESTAMP)
  `).run(base64)
  return { success: true }
})

// Get app info
ipcMain.handle('app:info', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const dbPath = require('path').join(
    require('electron').app.getPath('userData'),
    'weighbridge.db'
  )
  return {
    version: app.getVersion(),
    dbPath,
    platform: process.platform,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
  }
})

// Login with username + password
ipcMain.handle('auth:login', (event, username, password) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const user = db.prepare(`
    SELECT * FROM users
    WHERE username = ? AND password = ? AND is_active = 1
  `).get(username, password)
  if (!user) return { success: false, error: 'Invalid username or password' }
  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    }
  }
})

// Login with PIN
ipcMain.handle('auth:loginPin', (event, pin) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const user = db.prepare(`
    SELECT * FROM users
    WHERE pin = ? AND is_active = 1
    ORDER BY 
      CASE role
        WHEN 'superadmin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'operator' THEN 3
      END
    LIMIT 1
  `).get(pin)
  if (!user) return { success: false, error: 'Invalid PIN' }
  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    }
  }
})

// Get all users (admin only)
ipcMain.handle('users:getAll', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  return db.prepare(`
    SELECT id, username, full_name, role, pin, is_active, created_at
    FROM users ORDER BY role, username
  `).all()
})

// Add user
ipcMain.handle('users:add', (event, data) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  try {
    // Check plan user limit
    const plan = db.prepare("SELECT value FROM settings WHERE key = 'license_plan'").get()?.value || 'basic'
    if (plan === 'basic') {
      const count = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'operator' AND is_active = 1").get()
      if (count.c >= 2) {
        return { success: false, error: 'Basic plan allows maximum 2 operators. Upgrade to Pro for more.' }
      }
    }
    if (plan === 'pro') {
      const count = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'operator' AND is_active = 1").get()
      if (count.c >= 5) {
        return { success: false, error: 'Pro plan allows maximum 5 operators. Upgrade to Enterprise for unlimited.' }
      }
    }
    db.prepare(`
      INSERT INTO users (username, password, pin, role, full_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.username, data.password, data.pin, data.role, data.full_name)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Update user
ipcMain.handle('users:update', (event, id, data) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  try {
    db.prepare(`
      UPDATE users SET
        full_name  = ?,
        password   = ?,
        pin        = ?,
        role       = ?,
        is_active  = ?
      WHERE id = ?
    `).run(data.full_name, data.password, data.pin, data.role, data.is_active, id)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Delete user
ipcMain.handle('users:delete', (event, id) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  return { success: true }
})

// Hidden developer login — Ctrl+Shift+D
ipcMain.handle('auth:devLogin', (event, password) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const user = db.prepare(`
    SELECT * FROM users
    WHERE role = 'superadmin' AND password = ? AND is_active = 1
  `).get(password)
  if (!user) return { success: false, error: 'Invalid developer password' }
  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    }
  }
})

// Generate unique per-client password
ipcMain.handle('auth:generateDevPassword', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  // Get machine-specific info
  const os = require('os')
  const hostname = os.hostname()
  const setting = db.prepare(
    "SELECT value FROM settings WHERE key = 'company_name'"
  ).get()
  const companyName = setting?.value || 'WB'
  // Generate deterministic password from machine info
  const crypto = require('crypto')
  const hash = crypto
    .createHash('sha256')
    .update(hostname + companyName + 'WB2026SECRET')
    .digest('hex')
    .slice(0, 8)
    .toUpperCase()
  const password = `WB-${new Date().getFullYear()}-${hash}`
  // Update superadmin password
  db.prepare(`
    UPDATE users SET password = ? WHERE role = 'superadmin'
  `).run(password)
  return { password }
})
// Change own password
ipcMain.handle('auth:changePassword', (event, userId, currentPassword, newPassword, newPin) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  try {
    // Verify current password first
    const user = db.prepare(`
      SELECT * FROM users WHERE id = ? AND password = ?
    `).get(userId, currentPassword)
    if (!user) return { success: false, error: 'Current password is incorrect' }

    // Validate new PIN
    if (newPin && !/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'PIN must be exactly 4 digits' }
    }

    // Update password and PIN
    db.prepare(`
      UPDATE users SET password = ?, pin = ? WHERE id = ?
    `).run(newPassword, newPin || user.pin, userId)

    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Admin reset any user password (no current password needed)
ipcMain.handle('auth:resetPassword', (event, targetUserId, newPassword, newPin) => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  try {
    if (newPin && !/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'PIN must be exactly 4 digits' }
    }
    db.prepare(`
      UPDATE users SET password = ?, pin = ? WHERE id = ?
    `).run(newPassword, newPin, targetUserId)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Get charges config
ipcMain.handle('settings:getCharges', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT key, value FROM settings
    WHERE key IN ('charges_type','charges_rate')
  `).all()
  return rows.reduce((acc, r) => {
    acc[r.key] = r.value
    return acc
  }, {})
})

// ─── PRINT HANDLERS ──────────────────────────────────

// List all printers installed on Windows
ipcMain.handle('printer:getAll', async () => {
  try {
    const wins = require('electron').BrowserWindow.getAllWindows()
    if (!wins.length) return []
    const printers = await wins[0].webContents.getPrintersAsync()
    return printers.map(p => ({ name: p.name, isDefault: p.isDefault }))
  } catch (e) {
    log.error('printer:getAll error:', e.message)
    return []
  }
})

// Print HTML content to selected printer
ipcMain.handle('printer:print', (event, htmlContent, printerName, copies) => {
  return new Promise((resolve) => {
    try {
      const { BrowserWindow } = require('electron')
      const printWin = new BrowserWindow({
        width: 1200, height: 800,
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      })
      const encoded = Buffer.from(htmlContent, 'utf8').toString('base64')
      printWin.loadURL(`data:text/html;base64,${encoded}`)
      printWin.webContents.once('did-finish-load', () => {
        printWin.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName: printerName || '',
            margins: { marginType: 'none' },
            copies: parseInt(copies || 1),
          },
          (success, reason) => {
            printWin.destroy()
            resolve({ success, reason: reason || null })
          }
        )
      })
      printWin.webContents.once('did-fail-load', (e, code, desc) => {
        printWin.destroy()
        resolve({ success: false, reason: desc })
      })
    } catch (e) {
      resolve({ success: false, reason: e.message })
    }
  })
})

// Get all print + company settings for ticket generation
ipcMain.handle('settings:getPrint', () => {
  try {
    const { getDatabase } = require('./database')
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT key, value FROM settings
      WHERE key LIKE 'print_%'
         OR key LIKE 'company_%'
         OR key = 'printer_name'
         OR key = 'ticket_footer'
    `).all()
    return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc }, {})
  } catch (e) {
    log.error('settings:getPrint error:', e.message)
    return {}
  }
})

// License validation on startup
ipcMain.handle('license:validate', async () => {
  try {
    const { getDatabase } = require('./database')
    const db = getDatabase()
    const os = require('os')
    const crypto = require('crypto')

    // Get stored license key
    const row = db.prepare("SELECT value FROM settings WHERE key = 'license_key'").get()
    const licenseKey = row?.value || ''

    if (!licenseKey) return { valid: false, reason: 'no_license' }

    // Generate machine ID
    const machineId = crypto
      .createHash('sha256')
      .update(os.hostname() + os.platform())
      .digest('hex')
      .slice(0, 16)

    // Call your server
    const response = await fetch(`${getConfig().SERVER_URL}/api/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, machineId }),
      signal: AbortSignal.timeout(8000),
    })

    const data = await response.json()
    if (data.valid) {
      const { getDatabase } = require('./database')
      const db = getDatabase()
      db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('license_plan', ?, CURRENT_TIMESTAMP)
  `).run(data.plan || 'basic')
    }
    return { ...data, machineId }

  } catch (e) {
    // Server unreachable → allow if license was previously valid
    log.warn('License server unreachable:', e.message)
    return { valid: true, reason: 'offline_grace' }
  }
})

// Activate license
ipcMain.handle('license:activate', async (event, licenseKey) => {
  try {
    const { getDatabase } = require('./database')
    const db = getDatabase()
    const os = require('os')
    const crypto = require('crypto')

    const machineId = crypto
      .createHash('sha256')
      .update(os.hostname() + os.platform())
      .digest('hex')
      .slice(0, 16)

    const response = await fetch(`${getConfig().SERVER_URL}/api/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, machineId }),
      signal: AbortSignal.timeout(8000),
    })

    const data = await response.json()

    if (data.valid) {
      db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('license_key', ?, CURRENT_TIMESTAMP)
  `).run(licenseKey)
      // Store plan locally
      db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('license_plan', ?, CURRENT_TIMESTAMP)
  `).run(data.plan || 'basic')
      db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('license_client', ?, CURRENT_TIMESTAMP)
  `).run(data.clientName || '')
    }

    return { ...data, machineId }
  } catch (e) {
    // Distinguish between network error and other errors
    if (e.name === 'TimeoutError' || e.message.includes('fetch')) {
      return { valid: false, reason: 'server_error', error: 'Cannot reach license server. Check internet connection.' }
    }
    return { valid: false, reason: 'server_error', error: e.message }
  }
})

// ─── DATA MIGRATION ──────────────────────────────────

ipcMain.handle('migration:readMdb', async (event, filePath) => {
  try {

    const fs = require('fs')

    const buffer = fs.readFileSync(filePath)
    const reader = new MDBReader(buffer)

    const result = {
      tickets: [],
      vehicles: [],
      materials: [],
      suppliers: [],
      receivers: [],
    }

    // ── Read tickets
    try {
      const table = reader.getTable('TBLTicketMaster')
      result.tickets = table.getData()
    } catch (e) { log.warn('No ticket table:', e.message) }

    // ── Read vehicles
    try {
      const table = reader.getTable('LSTVehicleMaster')
      result.vehicles = table.getData()
    } catch (e) { log.warn('No vehicle table:', e.message) }

    // ── Read materials
    try {
      const table = reader.getTable('LSTMaterialMaster')
      result.materials = table.getData()
    } catch (e) { log.warn('No material table:', e.message) }

    // ── Read suppliers
    try {
      const table = reader.getTable('LSTSupplierMaster')
      result.suppliers = table.getData()
    } catch (e) { log.warn('No supplier table:', e.message) }

    // ── Read receivers
    try {
      const table = reader.getTable('LSTReceiverMaster')
      result.receivers = table.getData()
    } catch (e) { log.warn('No receiver table:', e.message) }

    return { success: true, data: result }

  } catch (e) {
    log.error('MDB read error:', e.message)
    return { success: false, error: e.message }
  }
})

ipcMain.handle('migration:import', (event, data) => {
  try {
    const { getDatabase } = require('./database')
    const db = getDatabase()

    let imported = {
      tickets: 0, vehicles: 0,
      materials: 0, suppliers: 0, receivers: 0,
      skipped: 0,
    }

    // ── Import materials
    const insertMaterial = db.prepare(`
      INSERT OR IGNORE INTO materials (name, rate_per_ton)
      VALUES (?, 0)
    `)
    for (const m of data.materials) {
      const name = (m.Material || '').toString().trim()
      if (!name) continue
      insertMaterial.run(name)
      imported.materials++
    }

    // ── Import suppliers
    const insertSupplier = db.prepare(`
      INSERT OR IGNORE INTO suppliers (name) VALUES (?)
    `)
    for (const s of data.suppliers) {
      const name = (s.Supplier || '').toString().trim()
      if (!name) continue
      insertSupplier.run(name)
      imported.suppliers++
    }

    // ── Import receivers
    const insertReceiver = db.prepare(`
      INSERT OR IGNORE INTO receivers (name) VALUES (?)
    `)
    for (const r of data.receivers) {
      const name = (r.Receiver || '').toString().trim()
      if (!name) continue
      insertReceiver.run(name)
      imported.receivers++
    }

    // ── Import vehicles
    const insertVehicle = db.prepare(`
      INSERT OR IGNORE INTO vehicles (vehicle_no, standard_tare)
      VALUES (?, ?)
    `)
    for (const v of data.vehicles) {
      const no = (v.Vehicle || '').toString().trim()
      const tare = parseFloat(v.Tare || 0)
      if (!no) continue
      insertVehicle.run(no, tare)
      imported.vehicles++
    }

    // ── Import tickets
    const insertTicket = db.prepare(`
      INSERT OR IGNORE INTO tickets (
        ticket_no, vehicle_no, material_name,
        supplier_name, receiver_name,
        gross_weight, tare_weight, net_weight,
        charges, royalty_no,
        gross_date, tare_date,
        gross_time, tare_time,
        status, is_synced
      ) VALUES (
        @ticket_no, @vehicle_no, @material_name,
        @supplier_name, @receiver_name,
        @gross_weight, @tare_weight, @net_weight,
        @charges, @royalty_no,
        @gross_date, @tare_date,
        @gross_time, @tare_time,
        'complete', 0
      )
    `)

    for (const t of data.tickets) {
      try {
        const ticketNo = parseInt(t.TicketNo || t.ticketno || 0)
        if (!ticketNo) { imported.skipped++; continue }

        // Format date from MDB (comes as Date object or string)
        const fmtDate = (d) => {
          if (!d) return ''
          const dt = new Date(d)
          if (isNaN(dt)) return ''
          return dt.toLocaleDateString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          }).replace(/\//g, '-')
        }

        const fmtTime = (d) => {
          if (!d) return ''
          const dt = new Date(d)
          if (isNaN(dt)) return ''
          return dt.toTimeString().slice(0, 5)
        }

        insertTicket.run({
          ticket_no: ticketNo,
          vehicle_no: (t.Vehicle || '').toString().trim(),
          material_name: (t.Material || '').toString().trim(),
          supplier_name: (t.Supplier || '').toString().trim(),
          receiver_name: (t.Receiver || '').toString().trim(),
          gross_weight: parseFloat(t.Gross || 0),
          tare_weight: parseFloat(t.Tare || 0),
          net_weight: parseFloat(t.Net || 0),
          charges: parseFloat(t.Rupees || 0),
          royalty_no: (t.RoyaltyNo || '').toString().trim(),
          gross_date: fmtDate(t.GrossOnDate),
          tare_date: fmtDate(t.TareOnDate),
          gross_time: fmtTime(t.GrossOnTime),
          tare_time: fmtTime(t.TareOnTime),
        })
        imported.tickets++
      } catch (e) {
        imported.skipped++
      }
    }

    // ── Set next ticket number to 983
    const maxTicket = db.prepare(
      'SELECT MAX(ticket_no) as max FROM tickets'
    ).get()
    const nextNo = (maxTicket?.max || 982) + 1
    db.prepare(`
      UPDATE settings SET value = ? WHERE key = 'ticket_next_no'
    `).run(nextNo.toString())

    return { success: true, imported }

  } catch (e) {
    log.error('Migration import error:', e.message)
    return { success: false, error: e.message }
  }
})

// File picker for MDB file
ipcMain.handle('dialog:openFile', async (event, filters) => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  })
  return result.canceled ? null : result.filePaths[0]
})

// ─── DIAGNOSTICS ─────────────────────────────────────

ipcMain.handle('diagnostics:run', async () => {
  const results = {}
  const { getDatabase } = require('./database')
  const os = require('os')

  // 1. Database check
  try {
    const db = getDatabase()
    db.prepare('SELECT 1').get()
    const ticketCount = db.prepare('SELECT COUNT(*) as c FROM tickets').get()
    results.database = {
      status: 'ok',
      message: 'Connected',
      detail: `${ticketCount.c} tickets`,
    }
  } catch (e) {
    results.database = {
      status: 'error',
      message: 'Database error',
      detail: e.message,
      fix: 'Restart the application. If problem persists contact developer.',
    }
  }

  // 2. License check
  try {
    const db = getDatabase()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'license_key'").get()
    const licenseKey = row?.value || ''
    if (!licenseKey) {
      results.license = {
        status: 'error',
        message: 'Not activated',
        detail: 'No license key found',
        fix: 'Enter your license key in the activation screen.',
      }
    } else {
      results.license = {
        status: 'ok',
        message: 'Activated',
        detail: licenseKey,
      }
    }
  } catch (e) {
    results.license = {
      status: 'error',
      message: 'License check failed',
      detail: e.message,
    }
  }

  // 3. Serial port check
  try {
    const db = getDatabase()
    const comPort = db.prepare("SELECT value FROM settings WHERE key = 'com_port'").get()?.value || 'COM1'
    const baudRate = db.prepare("SELECT value FROM settings WHERE key = 'baud_rate'").get()?.value || '2400'

    // Try to list available ports
    const { SerialPort } = require('serialport')
    const ports = await SerialPort.list()
    const found = ports.find(p =>
      p.path.toUpperCase() === comPort.toUpperCase()
    )

    if (ports.length === 0) {
      results.serialPort = {
        status: 'error',
        message: 'No serial ports found',
        detail: 'No COM ports detected on this computer',
        fix: '1. Check RS232 cable is connected\n2. Check Device Manager → Ports\n3. Try a USB-to-Serial adapter',
      }
    } else if (!found) {
      results.serialPort = {
        status: 'warning',
        message: `${comPort} not found`,
        detail: `Available ports: ${ports.map(p => p.path).join(', ')}`,
        fix: `1. Go to Settings → Hardware\n2. Change COM port to one of: ${ports.map(p => p.path).join(', ')}\n3. Check cable connection`,
      }
    } else {
      results.serialPort = {
        status: 'ok',
        message: `${comPort} detected`,
        detail: `Baud: ${baudRate} · ${found.manufacturer || 'Unknown device'}`,
      }
    }
  } catch (e) {
    results.serialPort = {
      status: 'warning',
      message: 'Serial port check skipped',
      detail: 'serialport package not installed yet',
      fix: 'Serial port will be enabled in next update.',
    }
  }

  // 4. Printer check
  try {
    const db = getDatabase()
    const savedPrinter = db.prepare("SELECT value FROM settings WHERE key = 'printer_name'").get()?.value || ''
    const wins = require('electron').BrowserWindow.getAllWindows()
    const printers = wins.length ? await wins[0].webContents.getPrintersAsync() : []

    if (printers.length === 0) {
      results.printer = {
        status: 'error',
        message: 'No printers found',
        detail: 'No printers installed on this computer',
        fix: '1. Check printer is plugged in and turned on\n2. Install printer driver\n3. Check Control Panel → Devices & Printers',
      }
    } else if (savedPrinter && !printers.find(p => p.name === savedPrinter)) {
      results.printer = {
        status: 'warning',
        message: 'Configured printer not found',
        detail: `"${savedPrinter}" is not installed`,
        fix: `1. Go to Settings → Printing\n2. Select correct printer from list\n3. Available: ${printers.map(p => p.name).join(', ')}`,
      }
    } else {
      const defaultPrinter = printers.find(p => p.isDefault)
      results.printer = {
        status: 'ok',
        message: savedPrinter || defaultPrinter?.name || 'System default',
        detail: `${printers.length} printer(s) installed`,
      }
    }
  } catch (e) {
    results.printer = {
      status: 'error',
      message: 'Printer check failed',
      detail: e.message,
      fix: 'Restart the application.',
    }
  }

  // 5. Internet check
  try {
    const response = await fetch(`${getConfig().SERVER_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    const data = await response.json()
    results.internet = {
      status: 'ok',
      message: 'Connected',
      detail: 'Server reachable',
    }
    results.server = {
      status: data.status === 'ok' ? 'ok' : 'warning',
      message: data.status === 'ok' ? 'Server online' : 'Server issue',
      detail: `MongoDB: ${data.mongo || 'unknown'} · v${data.version || '1.0.0'}`,
    }
  } catch (e) {
    results.internet = {
      status: 'warning',
      message: 'No internet',
      detail: 'Cannot reach server',
      fix: 'App works offline. EOD email and sync will resume when internet is available.',
    }
    results.server = {
      status: 'warning',
      message: 'Server unreachable',
      detail: 'Will retry when internet available',
    }
  }

  // 6. System info
  results.system = {
    status: 'ok',
    message: `${os.hostname()} · ${os.platform()} ${os.arch()}`,
    detail: `RAM: ${Math.round(os.freemem() / 1024 / 1024)}MB free of ${Math.round(os.totalmem() / 1024 / 1024)}MB · Node ${process.versions.node}`,
  }

  return results
})
// ─── LICENSE MANAGER ─────────────────────────────────

ipcMain.handle('licenseManager:create', async (event, clientName, plan, expiresAt) => {
  try {
    const response = await fetch(`${getConfig().SERVER_URL}/api/license/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devKey: getConfig().WB_DEV_KEY,
        clientName,
        plan: plan || 'basic',
        expiresAt: expiresAt || null,
      }),
      signal: AbortSignal.timeout(8000),
    })
    return await response.json()
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('licenseManager:getAll', async () => {
  try {
    const response = await fetch(`${getConfig().SERVER_URL}/api/license/all`, {
      headers: { 'x-dev-key': getConfig().WB_DEV_KEY },
      signal: AbortSignal.timeout(8000),
    })
    return await response.json()
  } catch (e) {
    return { error: e.message }
  }
})

ipcMain.handle('licenseManager:reset', async (event, licenseKey) => {
  try {
    const response = await fetch(`${getConfig().SERVER_URL}/api/license/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devKey: getConfig().WB_DEV_KEY,
        licenseKey,
      }),
      signal: AbortSignal.timeout(8000),
    })
    return await response.json()
  } catch (e) {
    return { error: e.message }
  }
})

// Verify OTP via server
ipcMain.handle('auth:verifyOtp', async (event, token) => {
  try {
    const response = await fetch(
      `${getConfig().SERVER_URL}/api/auth/verify-otp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(8000),
      }
    )
    return await response.json()
  } catch (e) {
    return { valid: false, error: e.message }
  }
})

// Grant superadmin access after OTP verified
ipcMain.handle('auth:devAccess', () => {
  const { getDatabase } = require('./database')
  const db = getDatabase()
  const user = db.prepare(`
    SELECT * FROM users
    WHERE role = 'superadmin' AND is_active = 1
    LIMIT 1
  `).get()
  if (!user) return { success: false, error: 'No superadmin found' }
  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    }
  }
})

// Restore a persisted login session if under 24h old
ipcMain.handle('session:get', () => {
  const fs = require('fs')
  const sessionPath = path.join(app.getPath('userData'), 'session.json')
  if (!fs.existsSync(sessionPath)) return null
  try {
    const { user, loginAt } = JSON.parse(fs.readFileSync(sessionPath, 'utf8'))
    const ageMs = Date.now() - new Date(loginAt).getTime()
    if (ageMs < 24 * 60 * 60 * 1000) return user
    return null
  } catch (e) {
    return null
  }
})

// Persist a login session
ipcMain.handle('session:save', (event, user) => {
  const fs = require('fs')
  const sessionPath = path.join(app.getPath('userData'), 'session.json')
  try {
    fs.writeFileSync(sessionPath, JSON.stringify({ user, loginAt: new Date().toISOString() }, null, 2))
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Clear a persisted session (sign out)
ipcMain.handle('session:clear', () => {
  const fs = require('fs')
  const sessionPath = path.join(app.getPath('userData'), 'session.json')
  try {
    if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Update license plan or status
ipcMain.handle('licenseManager:update', async (event, licenseKey, updates) => {
  try {
    const response = await fetch(`${getConfig().SERVER_URL}/api/license/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-key': getConfig().WB_DEV_KEY,
      },
      body: JSON.stringify({ licenseKey, ...updates }),
      signal: AbortSignal.timeout(8000),
    })
    return await response.json()
  } catch (e) {
    return { error: e.message }
  }
})

// Delete license permanently
ipcMain.handle('licenseManager:delete', async (event, licenseKey) => {
  try {
    const response = await fetch(`${getConfig().SERVER_URL}/api/license/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-key': getConfig().WB_DEV_KEY,
      },
      body: JSON.stringify({ licenseKey }),
      signal: AbortSignal.timeout(8000),
    })
    return await response.json()
  } catch (e) {
    return { error: e.message }
  }
})

// ─── EOD EMAIL ───────────────────────────────────────

async function sendEodEmail() {
  try {
    const { getDatabase } = require('./database')
    const db = getDatabase()

    const getSetting = (key) =>
      db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value || ''

    const licenseKey = getSetting('license_key')
    const toEmail = getSetting('eod_owner_email')
    const clientName = getSetting('license_client') || getSetting('company_name')

    if (!toEmail) return { success: false, error: 'No owner email configured' }
    if (!licenseKey) return { success: false, error: 'No license key' }

    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).replace(/\//g, '-')

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_tickets,
        SUM(net_weight) as total_net,
        SUM(gross_weight) as total_gross,
        SUM(charges) as total_charges
      FROM tickets
      WHERE gross_date = ? OR tare_date = ?
    `).get(today, today)

    const tickets = db.prepare(`
      SELECT ticket_no, vehicle_no, material_name, net_weight, charges, status
      FROM tickets
      WHERE gross_date = ? OR tare_date = ?
      ORDER BY ticket_no DESC
    `).all(today, today)

    const response = await fetch(`${getConfig().SERVER_URL}/api/eod/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, toEmail, clientName, date: today, summary, tickets }),
      signal: AbortSignal.timeout(15000),
    })

    const data = await response.json()

    if (data.success) {
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES ('last_eod_sent_date', ?, CURRENT_TIMESTAMP)
      `).run(today)
    }

    return data
  } catch (e) {
    log.error('EOD email error:', e.message)
    return { success: false, error: e.message }
  }
}

ipcMain.handle('eod:sendNow', async () => {
  return await sendEodEmail()
})

// Check every minute whether it's time to send EOD email
setInterval(async () => {
  try {
    const { getDatabase } = require('./database')
    const db = getDatabase()

    const getSetting = (key) =>
      db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value || ''

    if (getSetting('eod_enabled') !== 'true') return

    const sendTime = getSetting('eod_send_time') || '20:00'
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (currentTime !== sendTime) return

    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).replace(/\//g, '-')

    const lastSent = getSetting('last_eod_sent_date')
    if (lastSent === today) return

    log.info('EOD scheduler: sending email for', today)
    await sendEodEmail()
  } catch (e) {
    log.error('EOD scheduler error:', e.message)
  }
}, 60000)

// ─── SYNC TO SERVER ──────────────────────────────────

ipcMain.handle('sync:push', async () => {
  try {
    const { getDatabase } = require('./database')
    const db = getDatabase()

    const licenseKey = db.prepare(
      "SELECT value FROM settings WHERE key = 'license_key'"
    ).get()?.value

    if (!licenseKey) return { success: false, error: 'No license key' }

    // Get tickets not yet synced
    const tickets = db.prepare(`
      SELECT * FROM tickets WHERE is_synced = 0 OR is_synced IS NULL
      ORDER BY ticket_no ASC
      LIMIT 100
    `).all()

    if (tickets.length === 0) {
      return { success: true, synced: 0 }
    }

    const response = await fetch(`${getConfig().SERVER_URL}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, tickets }),
      signal: AbortSignal.timeout(15000),
    })

    const data = await response.json()

    if (data.success) {
      // Mark these tickets as synced
      const ids = tickets.map(t => t.id)
      const placeholders = ids.map(() => '?').join(',')
      db.prepare(`
        UPDATE tickets SET is_synced = 1 WHERE id IN (${placeholders})
      `).run(...ids)
    }

    return data

  } catch (e) {
    log.warn('Sync failed (will retry later):', e.message)
    return { success: false, error: e.message }
  }
})


log.info('IPC handlers registered')