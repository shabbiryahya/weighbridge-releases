import { useState, useEffect } from 'react'

const TABS = [
  { id: 'daily',   label: '📅 Daily'   },
  { id: 'monthly', label: '📆 Monthly' },
  { id: 'search',  label: '🔍 Search'  },
  { id: 'all',     label: '📋 All Tickets' },
]

const S = {
  card: {
    background: 'white', borderRadius: 10,
    padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
  },
  statCard: (color) => ({
    background: color + '12', border: `2px solid ${color}`,
    borderRadius: 10, padding: '16px 20px', textAlign: 'center'
  }),
  statValue: (color) => ({
    fontSize: 24, fontWeight: 700,
    color, fontFamily: 'monospace'
  }),
  statLabel: {
    fontSize: 11, color: '#888',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 6
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 12px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottom: '2px solid #f0f0f0',
    background: '#fafafa'
  },
  td: {
    padding: '10px 12px', fontSize: 13,
    borderBottom: '1px solid #f5f5f5', color: '#333'
  },
  input: {
    padding: '8px 14px', borderRadius: 8,
    border: '1.5px solid #e0e0e0', fontSize: 14,
    outline: 'none', background: 'white'
  },
  badge: (color) => ({
    background: color + '15', color,
    padding: '2px 10px', borderRadius: 99,
    fontSize: 12, fontWeight: 600
  })
}

// Format date for display
const fmtDate = (str) => str || '—'
const fmtWt   = (w)   => w ? `${Number(w).toLocaleString('en-IN')} kg` : '—'
const fmtRs   = (r)   => r ? `₹${Number(r).toLocaleString('en-IN')}` : '—'

// Today's date in DD-MM-YYYY
const todayStr = () => {
  const d = new Date()
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, '-')
}

export default function ReportsScreen() {
  const [tab,       setTab]       = useState('daily')
  const [date,      setDate]      = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [month,     setMonth]     = useState(
    new Date().toISOString().slice(0, 7)
  )
  const [query,     setQuery]     = useState('')
  const [tickets,   setTickets]   = useState([])
  const [summary,   setSummary]   = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [page,      setPage]      = useState(1)
  const [total,     setTotal]     = useState(0)

  // Load data when tab or filters change
  useEffect(() => {
    if (tab === 'daily')   loadDaily()
    if (tab === 'monthly') loadMonthly()
    if (tab === 'all')     loadAll()
    if (tab === 'search' && query.length > 1) loadSearch()
  }, [tab, date, month, page])

  const loadDaily = async () => {
    setLoading(true)
    // Convert YYYY-MM-DD to DD-MM-YYYY for DB query
    const [y, m, d] = date.split('-')
    const dbDate = `${d}-${m}-${y}`
    const [data, sum] = await Promise.all([
      window.db.reports.daily(dbDate),
      window.db.reports.summary(dbDate),
    ])
    setTickets(data)
    setSummary(sum)
    setLoading(false)
  }

  const loadMonthly = async () => {
    setLoading(true)
    const [y, m] = month.split('-')
    const data = await window.db.reports.monthly(y, m)
    setTickets(data)
    // Calculate summary manually
    setSummary({
      total_tickets: data.length,
      total_net:     data.reduce((a, t) => a + (t.net_weight || 0), 0),
      total_gross:   data.reduce((a, t) => a + (t.gross_weight || 0), 0),
      total_charges: data.reduce((a, t) => a + (t.charges || 0), 0),
    })
    setLoading(false)
  }

  const loadSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    const data = await window.db.reports.search(query)
    setTickets(data)
    setSummary(null)
    setLoading(false)
  }

  const loadAll = async () => {
    setLoading(true)
    const { tickets: data, total: t } = await window.db.reports.all(page, 20)
    setTickets(data)
    setTotal(t)
    setSummary(null)
    setLoading(false)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setPage(1) }}
            style={{
              padding: '8px 18px', borderRadius: 8,
              fontSize: 14, cursor: 'pointer', border: '1.5px solid',
              fontWeight: tab === t.id ? 700 : 400,
              background:  tab === t.id ? '#1a1a2e' : 'white',
              borderColor: tab === t.id ? '#1a1a2e' : '#e0e0e0',
              color:       tab === t.id ? 'white'   : '#333',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ ...S.card, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>

          {tab === 'daily' && (
            <>
              <input type="date" value={date}
                onChange={e => setDate(e.target.value)}
                style={S.input} />
              <button onClick={loadDaily} style={{
                background: '#e94560', color: 'white', border: 'none',
                padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, fontWeight: 600
              }}>
                Load
              </button>
            </>
          )}

          {tab === 'monthly' && (
            <>
              <input type="month" value={month}
                onChange={e => setMonth(e.target.value)}
                style={S.input} />
              <button onClick={loadMonthly} style={{
                background: '#e94560', color: 'white', border: 'none',
                padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, fontWeight: 600
              }}>
                Load
              </button>
            </>
          )}

          {tab === 'search' && (
            <>
              <input
                value={query} placeholder="Search by vehicle, material, supplier..."
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadSearch()}
                style={{ ...S.input, width: 320 }}
              />
              <button onClick={loadSearch} style={{
                background: '#e94560', color: 'white', border: 'none',
                padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, fontWeight: 600
              }}>
                Search
              </button>
            </>
          )}

          {tab === 'all' && (
            <span style={{ fontSize: 13, color: '#888' }}>
              Showing all {total} tickets
            </span>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#aaa' }}>
            {tickets.length} results
          </span>

        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12
        }}>
          <div style={S.statCard('#e94560')}>
            <div style={S.statLabel}>Total Tickets</div>
            <div style={S.statValue('#e94560')}>
              {summary.total_tickets || 0}
            </div>
          </div>
          <div style={S.statCard('#2196f3')}>
            <div style={S.statLabel}>Total Gross</div>
            <div style={S.statValue('#2196f3')}>
              {Number(summary.total_gross || 0).toLocaleString('en-IN')}
              <span style={{ fontSize: 12, fontWeight: 400 }}> kg</span>
            </div>
          </div>
          <div style={S.statCard('#ff9800')}>
            <div style={S.statLabel}>Total Net</div>
            <div style={S.statValue('#ff9800')}>
              {Number(summary.total_net || 0).toLocaleString('en-IN')}
              <span style={{ fontSize: 12, fontWeight: 400 }}> kg</span>
            </div>
          </div>
          <div style={S.statCard('#00d4aa')}>
            <div style={S.statLabel}>Total Charges</div>
            <div style={S.statValue('#00d4aa')}>
              ₹{Number(summary.total_charges || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* Tickets table */}
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
            Loading...
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#ccc' }}>
            No tickets found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['#', 'Date', 'Vehicle', 'Material',
                    'Supplier', 'Gross', 'Tare', 'Net', 'Charges'
                  ].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ ...S.td, fontWeight: 700, color: '#e94560' }}>
                      #{t.ticket_no}
                    </td>
                    <td style={S.td}>{fmtDate(t.tare_date)}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{t.vehicle_no || '—'}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{t.vehicle_type}</div>
                    </td>
                    <td style={S.td}>{t.material_name || '—'}</td>
                    <td style={S.td}>{t.supplier_name || '—'}</td>
                    <td style={{ ...S.td, color: '#2196f3', fontFamily: 'monospace' }}>
                      {fmtWt(t.gross_weight)}
                    </td>
                    <td style={{ ...S.td, color: '#ff9800', fontFamily: 'monospace' }}>
                      {fmtWt(t.tare_weight)}
                    </td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#e94560', fontFamily: 'monospace' }}>
                      {fmtWt(t.net_weight)}
                    </td>
                    <td style={{ ...S.td, color: '#00d4aa' }}>
                      {fmtRs(t.charges)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination for All Tickets */}
      {tab === 'all' && totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: 8, alignItems: 'center'
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 16px', borderRadius: 6, border: '1.5px solid #e0e0e0',
              background: page === 1 ? '#f5f5f5' : 'white',
              cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13
            }}>
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: '#888' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 16px', borderRadius: 6, border: '1.5px solid #e0e0e0',
              background: page === totalPages ? '#f5f5f5' : 'white',
              cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13
            }}>
            Next →
          </button>
        </div>
      )}

    </div>
  )
}