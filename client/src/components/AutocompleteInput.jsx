import { useState, useRef, useEffect } from 'react'

export default function AutocompleteInput({
  value,
  onChange,
  suggestions = [],
  placeholder = '',
  label = '',
  required = false,
}) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState(value || '')
  const wrapRef             = useRef(null)

  // Sync external value
  useEffect(() => { setQuery(value || '') }, [value])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  const handleChange = (e) => {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  const handleSelect = (item) => {
    setQuery(item)
    onChange(item)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{
          fontSize: 12, color: '#666',
          marginBottom: 4, display: 'block'
        }}>
          {label} {required && <span style={{ color: '#e94560' }}>*</span>}
        </label>
      )}

      <input
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 6,
          border: `1.5px solid ${query ? '#e94560' : '#e0e0e0'}`,
          fontSize: 14,
          outline: 'none',
          background: query ? '#fff9f9' : 'white',
          transition: 'border 0.2s'
        }}
      />

      {/* Suggestions dropdown */}
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1.5px solid #e0e0e0',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: 200,
          overflowY: 'auto'
        }}>
          {filtered.map((item, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(item)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 13,
                borderBottom: '1px solid #f5f5f5',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.target.style.background = '#f9f9f9'}
              onMouseLeave={e => e.target.style.background = 'white'}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}