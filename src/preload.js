const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('db', {
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    update: (key, val) => ipcRenderer.invoke('settings:update', key, val),
    saveLogo: (base64) => ipcRenderer.invoke('settings:saveLogo', base64),
    getCharges: () => ipcRenderer.invoke('settings:getCharges'),
    getPrint: () => ipcRenderer.invoke('settings:getPrint'),
  },
  tickets: {
    nextNo: () => ipcRenderer.invoke('tickets:nextNo'),
    save: (data) => ipcRenderer.invoke('tickets:save', data),
    getRecent: () => ipcRenderer.invoke('tickets:getRecent'),
    getPending: () => ipcRenderer.invoke('tickets:getPending'),
    getById: (id) => ipcRenderer.invoke('tickets:getById', id),
    delete: (id) => ipcRenderer.invoke('tickets:delete', id),
  },
  vehicles: {
    getAll: () => ipcRenderer.invoke('vehicles:getAll'),
    getAllNos: () => ipcRenderer.invoke('vehicles:getAllNos'),
    getByNo: (no) => ipcRenderer.invoke('vehicles:getByNo', no),
    autoSave: (no, type) => ipcRenderer.invoke('vehicles:autoSave', no, type),
    updateTare: (no, tare) => ipcRenderer.invoke('vehicles:updateTare', no, tare),
  },
  materials: {
    getAll: () => ipcRenderer.invoke('materials:getAll'),
    add: (d) => ipcRenderer.invoke('materials:add', d),
  },
  suppliers: {
    getAll: () => ipcRenderer.invoke('suppliers:getAll'),
    add: (d) => ipcRenderer.invoke('suppliers:add', d),
  },
  receivers: {
    getAll: () => ipcRenderer.invoke('receivers:getAll'),
    add: (d) => ipcRenderer.invoke('receivers:add', d),
  },
  masters: {
    delete: (table, id) => ipcRenderer.invoke('masters:delete', table, id),
  },
  reports: {
    daily: (date) => ipcRenderer.invoke('reports:daily', date),
    monthly: (year, month) => ipcRenderer.invoke('reports:monthly', year, month),
    summary: (date) => ipcRenderer.invoke('reports:summary', date),
    search: (query) => ipcRenderer.invoke('reports:search', query),
    all: (page, limit) => ipcRenderer.invoke('reports:all', page, limit),
  },
  printer: {
    getAll: () => ipcRenderer.invoke('printer:getAll'),
    print: (html, printerName, copies) => ipcRenderer.invoke('printer:print', html, printerName, copies),
  },
  app: {
    info: () => ipcRenderer.invoke('app:info'),
  },
  auth: {
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    loginPin: (pin) => ipcRenderer.invoke('auth:loginPin', pin),
    generateDevPassword: () => ipcRenderer.invoke('auth:generateDevPassword'),
    changePassword: (userId, currentPwd, newPwd, newPin) =>
      ipcRenderer.invoke('auth:changePassword', userId, currentPwd, newPwd, newPin),
    resetPassword: (targetId, newPwd, newPin) =>
      ipcRenderer.invoke('auth:resetPassword', targetId, newPwd, newPin),
    verifyOtp: (token) => ipcRenderer.invoke('auth:verifyOtp', token),
    devAccess: () => ipcRenderer.invoke('auth:devAccess'),
  },
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    add: (data) => ipcRenderer.invoke('users:add', data),
    update: (id, data) => ipcRenderer.invoke('users:update', id, data),
    delete: (id) => ipcRenderer.invoke('users:delete', id),
  },
  license: {
    validate: () => ipcRenderer.invoke('license:validate'),
    activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
  },
  migration: {
    readMdb: (filePath) => ipcRenderer.invoke('migration:readMdb', filePath),
    import: (data) => ipcRenderer.invoke('migration:import', data),
  },
  dialog: {
    openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  },
  diagnostics: {
    run: () => ipcRenderer.invoke('diagnostics:run'),
  },
  licenseManager: {
    create: (clientName, plan, expiresAt) =>
      ipcRenderer.invoke('licenseManager:create', clientName, plan, expiresAt),
    getAll: () => ipcRenderer.invoke('licenseManager:getAll'),
    reset: (licenseKey) => ipcRenderer.invoke('licenseManager:reset', licenseKey),
    update: (licenseKey, updates) =>
      ipcRenderer.invoke('licenseManager:update', licenseKey, updates),
    delete: (licenseKey) =>
      ipcRenderer.invoke('licenseManager:delete', licenseKey),
  },
  sync: {
    push: () => ipcRenderer.invoke('sync:push'),
  },
  update: {
    onAvailable: (cb) => ipcRenderer.on('update:available', cb),
    onDownloaded: (cb) => ipcRenderer.on('update:downloaded', cb),
    install: () => ipcRenderer.invoke('update:install'),
  },
})