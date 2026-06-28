import { useState } from 'react'
import { previewTicket } from '../../components/TicketPrint'

const DEFAULT_POS = {
  ticket_no:    { x: 3,  y: 36, label: 'Sr.No' },
  material:     { x: 45, y: 36, label: 'Material' },
  vehicle_no:   { x: 90, y: 36, label: 'Truck No' },
  receiver:     { x: 3,  y: 43, label: 'Receiver' },
  supplier:     { x: 60, y: 43, label: 'Supplier' },
  charges:      { x: 90, y: 43, label: 'Rs.' },
  gross_weight: { x: 3,  y: 52, label: 'Gross' },
  gross_date:   { x: 45, y: 52, label: 'Gross Date' },
  gross_time:   { x: 90, y: 52, label: 'Gross Time' },
  tare_weight:  { x: 3,  y: 60, label: 'Tare' },
  tare_date:    { x: 45, y: 60, label: 'Tare Date' },
  tare_time:    { x: 90, y: 60, label: 'Tare Time' },
  net_weight:   { x: 3,  y: 68, label: 'Net' },
  royalty_no:   { x: 60, y: 68, label: 'Royalty' },
}

const DUMMY_FORM = {
  ticket_no: '983',
  vehicle_no: 'GJ-05-AB-1234',
  material_name: 'Sand',
  supplier_name: 'MAHAVIR T&S',
  receiver_name: 'KINAL',
  gross_weight: '12500',
  gross_date: '28-06-2026',
  gross_time: '14:35',
  tare_weight: '4200',
  tare_date: '28-06-2026',
  tare_time: '14:40',
  net_weight: '8300',
  charges: '450',
  royalty_no: '',
}

// 2px per mm for the preview
const SCALE = 2

export default function CoordinateCalibrator({ settings, onSave }) {
  const loadPos = () => {
    try {
      const saved = settings?.coordinate_positions
        ? JSON.parse(settings.coordinate_positions)
        : {}
      return Object.fromEntries(
        Object.entries(DEFAULT_POS).map(([key, def]) => [
          key,
          { ...def, ...(saved[key] || {}) },
        ])
      )
    } catch {
      return { ...DEFAULT_POS }
    }
  }

  const [pos, setPos] = useState(loadPos)
  const [saved, setSaved] = useState(false)

  const nudge = (key, axis, delta) =>
    setPos(prev => ({
      ...prev,
      [key]: { ...prev[key], [axis]: Math.max(0, (prev[key][axis] ?? 0) + delta) },
    }))

  const reset = () => {
    setPos({ ...DEFAULT_POS })
    setSaved(false)
  }

  const handleSave = () => {
    const toSave = Object.fromEntries(
      Object.entries(pos).map(([k, v]) => [k, { x: v.x, y: v.y }])
    )
    onSave(JSON.stringify(toSave))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTestPrint = () => {
    previewTicket(DUMMY_FORM, {
      ...settings,
      print_mode: 'coordinate_2copy',
      coordinate_positions: JSON.stringify(
        Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, { x: v.x, y: v.y }]))
      ),
    })
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        background: '#f0f7ff', border: '1.5px solid #90caf9',
        borderRadius: 10, padding: '14px 18px', marginBottom: 16,
        fontSize: 13, color: '#1565c0',
      }}>
        📐 <strong>How to calibrate:</strong> Click <em>Print Test Ticket</em> →
        lay it on your stationery → measure how many mm each value is off →
        nudge with the +/− buttons → Save → test again.
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Field table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Field', 'X — left/right (mm)', 'Y — up/down (mm)'].map(h => (
                  <th key={h} style={{
                    padding: '8px 8px', textAlign: h === 'Field' ? 'left' : 'center',
                    borderBottom: '2px solid #e0e0e0', color: '#888', fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(pos).map(([key, p], i) => (
                <tr key={key} style={{
                  borderBottom: '1px solid #f5f5f5',
                  background: i % 2 === 0 ? 'white' : '#fafafa',
                }}>
                  <td style={{ padding: '7px 8px', fontWeight: 600, color: '#1a1a2e' }}>
                    {p.label}
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                    <NudgeControl value={p.x} onNudge={d => nudge(key, 'x', d)} />
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                    <NudgeControl value={p.y} onNudge={d => nudge(key, 'y', d)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visual preview */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6, textAlign: 'center' }}>
            Live Preview — ORIGINAL copy
          </div>
          <div style={{
            position: 'relative',
            width: 125 * SCALE,
            height: 101 * SCALE,
            border: '1.5px solid #ccc',
            background: '#fff',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            {/* Header zone */}
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: 34 * SCALE,
              background: '#f0f7ff',
              borderBottom: '1px dashed #90caf9',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 8, color: '#90caf9', letterSpacing: 0.5 }}>
                HEADER (pre-printed by stationery shop)
              </span>
            </div>

            {/* Field dots + labels */}
            {Object.entries(pos).map(([key, p]) => (
              <div key={key}>
                {/* Dot at position */}
                <div style={{
                  position: 'absolute',
                  left: p.x * SCALE - 2,
                  top: p.y * SCALE - 2,
                  width: 4, height: 4,
                  borderRadius: '50%',
                  background: '#e94560',
                }} />
                {/* Label */}
                <div style={{
                  position: 'absolute',
                  left: p.x * SCALE + 4,
                  top: p.y * SCALE - 5,
                  fontSize: 7,
                  color: '#e94560',
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold',
                }}>
                  {p.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 4 }}>
            125mm × 101mm
          </div>
        </div>

      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button onClick={reset} style={{
          background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8,
          padding: '9px 16px', fontSize: 13, cursor: 'pointer', color: '#555',
        }}>
          ↺ Reset to Defaults
        </button>
        <button onClick={handleTestPrint} style={{
          background: '#1a1a2e', color: 'white', border: 'none',
          borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer',
        }}>
          🖨 Print Test Ticket
        </button>
        <button onClick={handleSave} style={{
          flex: 1, background: saved ? '#00d4aa' : '#e94560', color: 'white',
          border: 'none', borderRadius: 8, padding: '9px 16px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'background 0.3s',
        }}>
          {saved ? '✓ Saved!' : 'Save Positions'}
        </button>
      </div>
    </div>
  )
}

function NudgeControl({ value, onNudge }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={() => onNudge(-1)}
        style={{
          width: 24, height: 24, border: '1px solid #ddd', borderRadius: 4,
          cursor: 'pointer', background: 'white', fontSize: 15,
          lineHeight: 1, padding: 0, color: '#555',
        }}
      >−</button>
      <span style={{
        minWidth: 32, textAlign: 'center',
        fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
        color: '#1a1a2e',
      }}>
        {value}
      </span>
      <button
        onClick={() => onNudge(1)}
        style={{
          width: 24, height: 24, border: '1px solid #ddd', borderRadius: 4,
          cursor: 'pointer', background: 'white', fontSize: 15,
          lineHeight: 1, padding: 0, color: '#555',
        }}
      >+</button>
    </div>
  )
}
