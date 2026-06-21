import { useState, useEffect } from 'react'
import MaskedSecretReveal from '../../components/MaskedSecretReveal'

const STATUS_CONFIG = {
  ok:      { color: '#00d4aa', bg: '#f0fdf9', icon: '✅', label: 'OK'      },
  warning: { color: '#ff9800', bg: '#fff8e1', icon: '⚠️', label: 'Warning' },
  error:   { color: '#e94560', bg: '#fff5f5', icon: '❌', label: 'Error'   },
  checking:{ color: '#2196f3', bg: '#f0f4ff', icon: '⏳', label: 'Checking'},
}

const CHECKS = [
  { key: 'database',   label: 'Database',     icon: '🗄️'  },
  { key: 'license',    label: 'License',      icon: '🔑'  },
  { key: 'serialPort', label: 'Weight Indicator (Serial Port)', icon: '⚖️' },
  { key: 'printer',    label: 'Printer',      icon: '🖨️'  },
  { key: 'internet',   label: 'Internet',     icon: '🌐'  },
  { key: 'server',     label: 'Server',       icon: '☁️'  },
  { key: 'system',     label: 'System Info',  icon: '💻'  },
]

export default function DiagnosticsScreen() {
  const [results,  setResults]  = useState({})
  const [running,  setRunning]  = useState(false)
  const [lastRun,  setLastRun]  = useState(null)
  const [expanded, setExpanded] = useState({})

  useEffect(() => { runChecks() }, [])

  const runChecks = async () => {
    setRunning(true)
    setResults({})
    try {
      const data = await window.db.diagnostics.run()
      setResults(data)
      setLastRun(new Date().toLocaleTimeString('en-IN'))
    } catch (e) {
      setResults({ error: { status: 'error', message: e.message } })
    } finally {
      setRunning(false)
    }
  }

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const overallStatus = () => {
    const statuses = Object.values(results).map(r => r.status)
    if (statuses.includes('error'))   return 'error'
    if (statuses.includes('warning')) return 'warning'
    if (statuses.length > 0)          return 'ok'
    return 'checking'
  }

  const overall = overallStatus()
  const cfg     = STATUS_CONFIG[running ? 'checking' : overall]

  return (
    <div>
      {/* Overall status banner */}
      <div style={{
        background: cfg.bg,
        border: `2px solid ${cfg.color}`,
        borderRadius: 12, padding: '20px 24px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 36 }}>{cfg.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: cfg.color }}>
              {running ? 'Running diagnostics...' :
               overall === 'ok'      ? 'All systems working' :
               overall === 'warning' ? 'Some warnings found' :
               'Issues detected — action required'}
            </div>
            {lastRun && !running && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                Last checked: {lastRun}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={runChecks}
          disabled={running}
          style={{
            background: running ? '#ccc' : '#1a1a2e',
            color: 'white', border: 'none',
            borderRadius: 8, padding: '10px 20px',
            fontSize: 13, fontWeight: 600,
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? '⏳ Checking...' : '🔄 Run Again'}
        </button>
      </div>

      {/* Individual checks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CHECKS.map(({ key, label, icon }) => {
          const result = results[key]
          const status = running ? 'checking' : (result?.status || 'checking')
          const c      = STATUS_CONFIG[status]
          const isOpen = expanded[key]

          return (
            <div key={key} style={{
              background: 'white',
              borderRadius: 10,
              border: `1.5px solid ${result ? c.color + '44' : '#e0e0e0'}`,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {/* Row */}
              <div
                onClick={() => result && toggleExpand(key)}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '14px 18px', gap: 14,
                  cursor: result ? 'pointer' : 'default',
                }}
              >
                <div style={{ fontSize: 20 }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>
                    {label}
                  </div>
                  {result && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {key === 'license' && result.status === 'ok'
                        ? <MaskedSecretReveal value={result.detail} monoFontSize={12} />
                        : result.detail}
                    </div>
                  )}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    background: c.bg,
                    color: c.color,
                    border: `1px solid ${c.color}`,
                    borderRadius: 99,
                    padding: '3px 10px',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {c.icon} {result?.message || c.label}
                  </span>
                  {result?.fix && (
                    <span style={{ fontSize: 16, color: '#ccc' }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </div>

              {/* Fix section */}
              {isOpen && result?.fix && (
                <div style={{
                  background: '#fff8e1',
                  borderTop: '1px solid #ffe082',
                  padding: '12px 18px',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#cc7a00',
                    letterSpacing: 1, textTransform: 'uppercase',
                    marginBottom: 6,
                  }}>
                    How to Fix
                  </div>
                  <div style={{ fontSize: 13, color: '#795548', lineHeight: 1.6 }}>
                    {result.fix.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: 20, padding: '12px 16px',
        background: '#fafafa', borderRadius: 8,
        fontSize: 12, color: '#aaa', textAlign: 'center',
      }}>
        Click any row with ▼ to see how to fix the issue.
        Contact developer if problem persists.
      </div>
    </div>
  )
}