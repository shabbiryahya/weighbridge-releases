import { useState, useEffect } from 'react'

const PLANS = ['basic', 'pro', 'enterprise']

export default function LicenseManager() {
  const [licenses,   setLicenses]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newKey,     setNewKey]     = useState(null)
  const [copied,     setCopied]     = useState(false)
  const [error,      setError]      = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [form, setForm] = useState({
    clientName: '', plan: 'basic', expiresAt: '',
  })

  useEffect(() => { loadLicenses() }, [])

  const loadLicenses = async () => {
    setLoading(true)
    try {
      const data = await window.db.licenseManager.getAll()
      if (data.error) setError('Cannot reach server: ' + data.error)
      else setLicenses(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!form.clientName.trim()) return setError('Client name is required')
    setGenerating(true)
    setError('')
    setNewKey(null)
    try {
      const result = await window.db.licenseManager.create(
        form.clientName.trim(), form.plan, form.expiresAt || null
      )
      if (result.error) setError(result.error)
      else {
        setNewKey(result.licenseKey)
        setForm({ clientName: '', plan: 'basic', expiresAt: '' })
        await loadLicenses()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdate = async (licenseKey, updates, label) => {
  setActionLoading(licenseKey + label)
  setError('')
  try {
    const result = await window.db.licenseManager.update(licenseKey, updates)
    if (result.error) {
      setError(result.error)
    } else {
      // If plan changed, update local SQLite too
      if (updates.plan) {
        await window.db.settings.update('license_plan', updates.plan)
        // Reload app to apply new plan restrictions
        setTimeout(() => window.location.reload(), 500)
      } else {
        await loadLicenses()
      }
    }
  } catch (e) {
    setError(e.message)
  } finally {
    setActionLoading(null)
  }
}

  const handleReset = async (licenseKey, clientName) => {
    if (!window.confirm(`Reset machine binding for "${clientName}"?\n\nThey will need to re-activate on their machine.`)) return
    setActionLoading(licenseKey + 'reset')
    try {
      await window.db.licenseManager.reset(licenseKey)
      await loadLicenses()
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (licenseKey, clientName) => {
    if (!window.confirm(`PERMANENTLY DELETE license for "${clientName}"?\n\nThis cannot be undone. Their app will stop working.`)) return
    setActionLoading(licenseKey + 'delete')
    try {
      const result = await window.db.licenseManager.delete(licenseKey)
      if (result.error) setError(result.error)
      else await loadLicenses()
    } finally {
      setActionLoading(null)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  const S = {
    card: {
      background: 'white', borderRadius: 10,
      padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      marginBottom: 16,
    },
    label: { fontSize: 12, color: '#666', marginBottom: 4, display: 'block', fontWeight: 500 },
    input: {
      width: '100%', padding: '9px 12px', borderRadius: 6,
      border: '1.5px solid #e0e0e0', fontSize: 14,
      outline: 'none', boxSizing: 'border-box',
    },
    select: {
      width: '100%', padding: '9px 12px', borderRadius: 6,
      border: '1.5px solid #e0e0e0', fontSize: 14,
      outline: 'none', background: 'white', cursor: 'pointer',
    },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 },
    btn: (bg, color) => ({
      background: bg, color, border: 'none',
      borderRadius: 6, padding: '5px 10px',
      fontSize: 11, fontWeight: 600,
      cursor: 'pointer', whiteSpace: 'nowrap',
    }),
  }

  return (
    <div>
      {/* Error */}
      {error && (
        <div style={{
          background: '#fff5f5', border: '1px solid #fcc',
          borderRadius: 8, padding: '10px 16px',
          fontSize: 13, color: '#e94560', marginBottom: 16,
        }}>
          ❌ {error}
          <button onClick={() => setError('')} style={{
            float: 'right', background: 'none', border: 'none',
            cursor: 'pointer', color: '#e94560', fontWeight: 700,
          }}>✕</button>
        </div>
      )}

      {/* Generate New License */}
      <div style={S.card}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#aaa',
          letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16,
        }}>
          Generate New License
        </div>
        <div style={S.grid3}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={S.label}>Client Name *</label>
            <input
              style={S.input}
              placeholder="e.g. Shree Bhagwati Weigh Bridge"
              value={form.clientName}
              onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
          </div>
          <div>
            <label style={S.label}>Plan</label>
            <select style={S.select} value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Expiry (optional)</label>
            <input style={S.input} type="date" value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleGenerate} disabled={generating} style={{
              width: '100%', background: generating ? '#ccc' : '#e94560',
              color: 'white', border: 'none', borderRadius: 8,
              padding: '10px', fontSize: 14, fontWeight: 700,
              cursor: generating ? 'not-allowed' : 'pointer',
            }}>
              {generating ? '⏳ Generating...' : '🔑 Generate'}
            </button>
          </div>
        </div>
      </div>

      {/* New Key Result */}
      {newKey && (
        <div style={{
          background: '#f0fdf9', border: '2px solid #00d4aa',
          borderRadius: 10, padding: '20px 24px', marginBottom: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#00a37a',
            letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
          }}>
            ✅ License Generated — Send to client
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              flex: 1, background: 'white', border: '1.5px solid #00d4aa',
              borderRadius: 8, padding: '12px 16px',
              fontFamily: 'monospace', fontSize: 18,
              fontWeight: 700, color: '#1a1a2e',
              letterSpacing: 2, textAlign: 'center',
            }}>
              {newKey}
            </div>
            <button onClick={() => copyToClipboard(newKey)} style={{
              background: copied ? '#00d4aa' : '#1a1a2e',
              color: 'white', border: 'none', borderRadius: 8,
              padding: '12px 20px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>
      )}

      {/* All Licenses */}
      <div style={S.card}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#aaa',
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            All Licenses ({licenses.length})
          </div>
          <button onClick={loadLicenses} style={{
            background: '#f5f5f5', border: '1px solid #ddd',
            borderRadius: 6, padding: '5px 12px',
            fontSize: 12, cursor: 'pointer',
          }}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>Loading...</div>
        ) : licenses.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: 24 }}>No licenses yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Client', 'License Key', 'Plan', 'Status', 'Activated', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: 'left',
                      borderBottom: '2px solid #f0f0f0',
                      fontSize: 11, fontWeight: 700,
                      color: '#888', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {licenses.map(lic => {
                  const isActive  = lic.isActive !== false
                  const isBound   = !!lic.machineId
                  const isExpired = lic.expiresAt && new Date(lic.expiresAt) < new Date()

                  return (
                    <tr key={lic.licenseKey}
                      style={{ opacity: isActive ? 1 : 0.6 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      {/* Client */}
                      <td style={{ padding: '12px', borderBottom: '1px solid #f5f5f5' }}>
                        <div style={{ fontWeight: 600, color: '#1a1a2e' }}>
                          {lic.clientName}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                          {fmtDate(lic.createdAt)}
                        </div>
                      </td>

                      {/* Key */}
                      <td style={{ padding: '12px', borderBottom: '1px solid #f5f5f5' }}>
                        <div style={{
                          fontFamily: 'monospace', fontSize: 12,
                          color: '#1a1a2e', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {lic.licenseKey}
                          <button onClick={() => copyToClipboard(lic.licenseKey)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                            title="Copy">📋</button>
                        </div>
                      </td>

                      {/* Plan — editable dropdown */}
                      <td style={{ padding: '12px', borderBottom: '1px solid #f5f5f5' }}>
                        <select
                          value={lic.plan || 'basic'}
                          onChange={async e => {
                            await handleUpdate(lic.licenseKey, { plan: e.target.value }, 'plan')
                          }}
                          style={{
                            background: '#f0f4ff', color: '#2196f3',
                            border: '1px solid #bbdefb', borderRadius: 6,
                            padding: '3px 8px', fontSize: 12,
                            fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {PLANS.map(p => (
                            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                          ))}
                        </select>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px', borderBottom: '1px solid #f5f5f5' }}>
                        <span style={{
                          background: isExpired ? '#fff5f5' : !isActive ? '#f5f5f5' : isBound ? '#f0fdf9' : '#fff8e1',
                          color:      isExpired ? '#e94560' : !isActive ? '#aaa'    : isBound ? '#00a37a' : '#cc7a00',
                          border: `1px solid ${isExpired ? '#fcc' : !isActive ? '#ddd' : isBound ? '#00d4aa' : '#ffe082'}`,
                          padding: '3px 8px', borderRadius: 99,
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {isExpired ? '❌ Expired' : !isActive ? '⛔ Disabled' : isBound ? '✅ Active' : '⏳ Not activated'}
                        </span>
                      </td>

                      {/* Activated */}
                      <td style={{ padding: '12px', borderBottom: '1px solid #f5f5f5', color: '#888', fontSize: 12 }}>
                        {fmtDate(lic.activatedAt)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px', borderBottom: '1px solid #f5f5f5' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>

                          {/* Activate / Deactivate toggle */}
                          <button
                            onClick={() => handleUpdate(
                              lic.licenseKey,
                              { isActive: !isActive },
                              'toggle'
                            )}
                            disabled={actionLoading === lic.licenseKey + 'toggle'}
                            style={S.btn(
                              isActive ? '#fff8e1' : '#f0fdf9',
                              isActive ? '#cc7a00' : '#00a37a'
                            )}
                            title={isActive ? 'Disable license' : 'Enable license'}
                          >
                            {actionLoading === lic.licenseKey + 'toggle' ? '...' :
                             isActive ? '⛔ Disable' : '✅ Enable'}
                          </button>

                          {/* Reset machine binding */}
                          {isBound && (
                            <button
                              onClick={() => handleReset(lic.licenseKey, lic.clientName)}
                              disabled={actionLoading === lic.licenseKey + 'reset'}
                              style={S.btn('#f0f4ff', '#2196f3')}
                              title="Unbind from current machine"
                            >
                              {actionLoading === lic.licenseKey + 'reset' ? '...' : '🔄 Reset'}
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(lic.licenseKey, lic.clientName)}
                            disabled={actionLoading === lic.licenseKey + 'delete'}
                            style={S.btn('#fff5f5', '#e94560')}
                            title="Permanently delete license"
                          >
                            {actionLoading === lic.licenseKey + 'delete' ? '...' : '🗑️ Delete'}
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        background: '#fafafa', borderRadius: 8,
        padding: '12px 16px', fontSize: 12, color: '#888',
      }}>
        <strong>Actions:</strong>
        {' '}⛔ Disable = blocks client app immediately (no deletion) ·
        {' '}🔄 Reset = unbinds machine so key can be used on new PC ·
        {' '}🗑️ Delete = permanent, cannot undo ·
        {' '}Plan dropdown = takes effect on client's next app restart
      </div>
    </div>
  )
}