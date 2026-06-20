import { useState, useEffect } from 'react'

const TOUR_STEPS = [
  {
    title: 'આપનું સ્વાગત છે! 🙏',
    desc: 'આ વજન મેનેજમેન્ટ સિસ્ટમ છે. દરરોજ ટ્રક આવે ત્યારે અહીં વજન નોંધાય છે.',
    icon: '⚖️',
    highlight: null,
  },
  {
    title: 'વજન જુઓ 📟',
    desc: 'ઉપર લીલા અક્ષરમાં ત્રાજવાનું LIVE વજન દેખાય છે. જ્યારે 🟢 Stable દેખાય ત્યારે વજન સ્થિર છે.',
    icon: '📟',
    highlight: 'weight-bar',
  },
  {
    title: 'ટ્રકની માહિતી ભરો 🚛',
    desc: 'ડાબી બાજુ ટ્રક નંબર અને માલ (Material) ભરો. Vehicle No. જરૂરી છે.',
    icon: '🚛',
    highlight: 'form',
  },
  {
    title: 'Gross અને Tare લો ⬇️',
    desc: 'પહેલા ભરેલા ટ્રકનું Gross વજન લો. ખાલી થાય પછી Tare વજન લો. Net આપોઆપ ગણાઈ જશે.',
    icon: '⬇️',
    highlight: 'capture',
  },
  {
    title: 'Save કરો અને Print કરો 💾',
    desc: 'બધું ભર્યા પછી "Save & Complete" દબાવો. પછી "Print Ticket" દબાવો — 3 કોપી print થશે.',
    icon: '🖨️',
    highlight: 'save',
  },
  {
    title: 'તૈયાર છો! ✅',
    desc: 'હવે તમે સિસ્ટમ વાપરવા તૈયાર છો. કોઈ મુશ્કેલી હોય તો Help મેનૂ જુઓ અથવા Saif Enterprises ને call કરો: +91 9574713452',
    icon: '✅',
    highlight: null,
  },
]

export default function AppTour({ onComplete }) {
  const [step, setStep] = useState(0)
  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: 'white', borderRadius: 20,
        padding: '36px 40px', maxWidth: 460, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        textAlign: 'center',
      }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {TOUR_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8,
              borderRadius: 99,
              background: i === step ? '#e94560' : i < step ? '#00d4aa' : '#e0e0e0',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ fontSize: 56, marginBottom: 16 }}>{current.icon}</div>

        {/* Title */}
        <div style={{
          fontSize: 20, fontWeight: 700,
          color: '#1a1a2e', marginBottom: 14,
        }}>
          {current.title}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 15, color: '#555',
          lineHeight: 1.8, marginBottom: 28,
        }}>
          {current.desc}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1, padding: '12px',
                background: '#f0f0f0', color: '#333',
                border: 'none', borderRadius: 10,
                fontSize: 15, cursor: 'pointer',
              }}
            >
              ← પાછળ
            </button>
          )}

          <button
            onClick={() => {
              if (isLast) {
                localStorage.setItem('wb_tour_done', '1')
                onComplete()
              } else {
                setStep(s => s + 1)
              }
            }}
            style={{
              flex: 2, padding: '12px',
              background: isLast ? '#00d4aa' : '#e94560',
              color: 'white', border: 'none',
              borderRadius: 10, fontSize: 15,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            {isLast ? '✅ શરૂ કરો!' : 'આગળ →'}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={() => {
              localStorage.setItem('wb_tour_done', '1')
              onComplete()
            }}
            style={{
              marginTop: 14, background: 'none',
              border: 'none', color: '#aaa',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Skip કરો
          </button>
        )}
      </div>
    </div>
  )
}