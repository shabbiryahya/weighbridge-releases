// src/config.js
// Central, runtime-editable configuration.
// Reads/writes %APPDATA%\weighbridge-app\config.json
// Change SERVER_URL here anytime (even after install) — no rebuild needed.

const fs = require('fs')
const path = require('path')

const DEFAULTS = {
  SERVER_URL: 'http://wcddev.duckdns.org',
  WB_DEV_KEY: 'WB_LICENSE_2026_SECRET',
}

function getConfigPath() {
  // 'electron' must be required lazily — config.js may load before app is ready
  const { app } = require('electron')
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig() {
  const configPath = getConfigPath()

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULTS, null, 2))
    return { ...DEFAULTS }
  }

  try {
    const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    return { ...DEFAULTS, ...saved }
  } catch (e) {
    // Corrupted file — fall back to defaults, don't crash the app
    return { ...DEFAULTS }
  }
}

let cached = null

function getConfig() {
  if (!cached) cached = loadConfig()
  return cached
}

module.exports = { getConfig, getConfigPath }