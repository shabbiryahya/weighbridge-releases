import { useState } from 'react'

const STEPS = ['select', 'preview', 'importing', 'done']

export default function MigrationTool() {
  const [step,     setStep]     = useState('select')
  const [filePath, setFilePath] = useState('')
  const [preview,  setPreview]  = useState(null)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')

  const handleSelectFile = async () => {
    setError('')
    const path = await window.db.dialog.openFile([
      { name: 'Access Database', extensions: ['mdb', 'accdb'] },
    ])
    if (!path) return

    setFilePath(path)
    const res = await window.db.migration.readMdb(path)

    if (!res.success) {
      setError('Could not read file: ' + res.error)
      return
    }

    setPreview(res.data)
    setStep('preview')
  }

  const handleImport = async () => {
    setStep('importing')
    const res = await window.db.migration.import(preview)
    if (res.success) {
      setResult(res.imported)
      setStep('done')
    } else {
      setError(res.error)
      setStep('preview')
    }
  }

  const reset = () => {
    setStep('select')
    setFilePath('')
    setPreview(null)
    setResult(null)
    setError('')
  }

  return (
    <div>
      {/* Warning banner */}
      <div style={{
        background: '#fff8e1', border: '1.5px solid #ff9800',
        borderRadius: 10, padding: '14px 18px',
        fontSize: 13, color: '#cc7a00', marginBottom: 20,
      }}>
        ⚠️ <strong>Run this only once</strong> on a fresh installation.
        Running again will skip duplicate ticket numbers but may
        create duplicate master data.
      </div>

      {/* Step: Select File */}
      {step === 'select' && (
        <div style={{
          background: 'white', borderRadius: 10,
          padding: '32px', textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
          <h3 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>
            Import from Legacy System
          </h3>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
            Select the <strong>WeightSystem.mdb</strong> file from the
            old software folder to import all tickets and master data.
          </p>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #fcc',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#e94560', marginBottom: 16,
            }}>
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleSelectFile}
            style={{
              background: '#e94560', color: 'white',
              border: 'none', borderRadius: 8,
              padding: '12px 28px', fontSize: 14,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            📂 Select WeightSystem.mdb
          </button>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && preview && (
        <div style={{
          background: 'white', borderRadius: 10,
          padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <h3 style={{ margin: '0 0 6px', color: '#1a1a2e' }}>
            Ready to Import
          </h3>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
            Found the following data in <code>{filePath.split('\\').pop()}</code>:
          </p>

          {/* Summary cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12, marginBottom: 24,
          }}>
            {[
              { label: 'Tickets',   count: preview.tickets.length,   color: '#e94560', icon: '🎫' },
              { label: 'Vehicles',  count: preview.vehicles.length,  color: '#2196f3', icon: '🚛' },
              { label: 'Materials', count: preview.materials.length, color: '#ff9800', icon: '📦' },
              { label: 'Suppliers', count: preview.suppliers.length, color: '#9c27b0', icon: '🏭' },
              { label: 'Receivers', count: preview.receivers.length, color: '#00d4aa', icon: '📬' },
            ].map(({ label, count, color, icon }) => (
              <div key={label} style={{
                background: color + '12',
                border: `2px solid ${color}`,
                borderRadius: 10, padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
                <div style={{
                  fontSize: 28, fontWeight: 700,
                  color, fontFamily: 'monospace',
                }}>
                  {count}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Sample tickets */}
          {preview.tickets.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#aaa',
                letterSpacing: 1, textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                Sample Tickets (first 3)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Ticket No', 'Vehicle', 'Material', 'Gross', 'Tare', 'Net', 'Charges'].map(h => (
                      <th key={h} style={{
                        padding: '8px 10px', textAlign: 'left',
                        borderBottom: '1px solid #e0e0e0',
                        color: '#888', fontWeight: 600,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.tickets.slice(0, 3).map((t, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f5f5f5' }}>
                        #{t.TicketNo}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f5f5f5' }}>
                        {t.Vehicle}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f5f5f5' }}>
                        {t.Material}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f5f5f5' }}>
                        {t.Gross} kg
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f5f5f5' }}>
                        {t.Tare} kg
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f5f5f5', fontWeight: 700 }}>
                        {t.Net} kg
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #f5f5f5' }}>
                        ₹{t.Rupees}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{
            background: '#f0fdf9', border: '1px solid #00d4aa',
            borderRadius: 8, padding: '12px 16px',
            fontSize: 13, color: '#00a37a', marginBottom: 20,
          }}>
            ✅ After import, next ticket number will be set to <strong>983</strong>
          </div>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #fcc',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#e94560', marginBottom: 16,
            }}>
              ❌ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={reset} style={{
              background: '#f0f0f0', color: '#333',
              border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 14,
              cursor: 'pointer',
            }}>
              ← Back
            </button>
            <button onClick={handleImport} style={{
              flex: 1, background: '#e94560', color: 'white',
              border: 'none', borderRadius: 8,
              padding: '10px', fontSize: 14,
              fontWeight: 700, cursor: 'pointer',
            }}>
              🚀 Start Import
            </button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <div style={{
          background: 'white', borderRadius: 10,
          padding: '48px', textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h3 style={{ color: '#1a1a2e' }}>Importing data...</h3>
          <p style={{ color: '#888' }}>Please wait. Do not close the app.</p>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && result && (
        <div style={{
          background: 'white', borderRadius: 10,
          padding: '32px', textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h3 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>
            Import Complete!
          </h3>
          <p style={{ color: '#888', marginBottom: 24 }}>
            All data has been imported successfully.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12, marginBottom: 24,
          }}>
            {[
              { label: 'Tickets Imported',   value: result.tickets,   color: '#e94560' },
              { label: 'Vehicles Imported',  value: result.vehicles,  color: '#2196f3' },
              { label: 'Materials Imported', value: result.materials, color: '#ff9800' },
              { label: 'Suppliers Imported', value: result.suppliers, color: '#9c27b0' },
              { label: 'Receivers Imported', value: result.receivers, color: '#00d4aa' },
              { label: 'Skipped (duplicates)', value: result.skipped, color: '#aaa' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: '#fafafa', borderRadius: 8,
                padding: '14px', textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 24, fontWeight: 700,
                  color, fontFamily: 'monospace',
                }}>
                  {value}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: '#f0fdf9', border: '1px solid #00d4aa',
            borderRadius: 8, padding: '12px 16px',
            fontSize: 13, color: '#00a37a', marginBottom: 20,
          }}>
            ✅ Next ticket number set to <strong>983</strong>
          </div>

          <p style={{ fontSize: 13, color: '#888' }}>
            Go to <strong>Reports</strong> to verify your imported tickets.
          </p>
        </div>
      )}
    </div>
  )
}