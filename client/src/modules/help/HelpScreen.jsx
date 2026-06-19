import { useState } from 'react'

const TABS = [
  { id: 'faq_gu',   label: '❓ FAQ (ગુજરાતી)' },
  { id: 'faq_en',   label: '❓ FAQ (English)'  },
  { id: 'howto',    label: '📖 How To Use'     },
  { id: 'shortcuts',label: '⌨️ Shortcuts'      },
  { id: 'contact',  label: '📞 Support'        },
]

const FAQ_GUJARATI = [
  {
    q: 'વજન કેવી રીતે કેપ્ચર કરવું?',
    a: 'વાહન ત્રાજવા પર ઊભું રહે અને વજન સ્થિર થાય ત્યારે "⬇️ Capture GROSS" અથવા "⬇️ Capture TARE" બટન દબાવો. વજન આપોઆપ ભરાઈ જશે.'
  },
  {
    q: 'ટિકિટ નંબર કેવી રીતે નક્કી થાય?',
    a: 'ટિકિટ નંબર આપોઆપ વધે છે. દરેક નવી ટિકિટ સેવ કરો ત્યારે નંબર આગળ વધે છે. તમારે કંઈ કરવાની જરૂર નથી.'
  },
  {
    q: 'જો વજન સ્થિર ન થાય તો?',
    a: 'વાહન ત્રાજવા પર સ્થિર ઊભું રહ્યું છે કે નહીં તે જુઓ. ઉપર લીલો ● દેખાય ત્યારે "Stable" છે એટલે Capture કરી શકાય.'
  },
  {
    q: 'Pending ટિકિટ શું છે?',
    a: 'જ્યારે ફક્ત Gross અથવા Tare બેમાંથી એક જ વજન લેવાયું હોય ત્યારે ટિકિટ Pending રહે છે. વાહન ખાલી થઈને પાછું આવે ત્યારે Pending ટિકિટ ખોલો અને બાકીનું વજન ભરો.'
  },
  {
    q: 'Tare વજન શું છે?',
    a: 'Tare એટલે ખાલી વાહનનું વજન. Gross એટલે માલ ભરેલા વાહનનું વજન. Net = Gross - Tare એટલે કે માત્ર માલનું વજન.'
  },
  {
    q: 'ટિકિટ પ્રિન્ટ કેવી રીતે કરવી?',
    a: 'ટિકિટ Complete થયા પછી "🖨️ Print Ticket" બટન દેખાશે. તે દબાવો. પ્રિન્ટ ન થાય તો Settings → Printing માં Printer નામ ચેક કરો.'
  },
  {
    q: 'Vehicle Number ભૂલ થઈ ગઈ હોય તો?',
    a: 'ટિકિટ Save થઈ ગઈ હોય તો Admin ને જણાવો. Admin Reports માં જઈ ટિકિટ Delete કરી નવી ટિકિટ બનાવી શકે છે.'
  },
  {
    q: 'Software બંધ થઈ જાય તો ડેટા જાય?',
    a: 'ના. બધો ડેટા આ computer માં save છે. Software બંધ થઈ ફરી ચાલુ કરો, બધો ડેટા મળશે.'
  },
  {
    q: 'Internet ન હોય તો software ચાલે?',
    a: 'હા. Software internet વગર પૂરું ચાલે છે. ટિકિટ, Reports, Print બધું offline ચાલે. Internet ફક્ત EOD email અને sync માટે જોઈએ.'
  },
  {
    q: 'Password ભૂલી ગયા હોય તો?',
    a: 'PIN ભૂલ્યા હો તો Admin ને જણાવો. Admin Settings → Users માં PIN reset કરી આપી શકે. Admin password ભૂલ્યા હો તો Developer ને contact કરો.'
  },
  {
    q: 'Charges આપોઆપ ભરાઈ જાય?',
    a: 'હા. Settings → Charges માં rate નક્કી કર્યા પ્રમાણે Charges આપોઆપ calculate થાય. જો Per Wheel હોય તો Wheels ની સંખ્યા ભરો.'
  },
  {
    q: 'Report કેવી રીતે જોવી?',
    a: 'ડાબી બાજુ "📊 Reports" menu માં click કરો. Daily, Monthly, Search — ગમે તે report select કરો અને date નાખો.'
  },
]

const FAQ_ENGLISH = [
  {
    q: 'How do I capture weight?',
    a: 'Wait for the vehicle to be stable on the weighbridge. When you see 🟢 Stable, click "⬇️ Capture GROSS" or "⬇️ Capture TARE". Weight fills automatically.'
  },
  {
    q: 'What is a Pending ticket?',
    a: 'When only one weight (Gross or Tare) has been captured, the ticket stays Pending. When the vehicle returns empty, open the Pending ticket and capture the remaining weight.'
  },
  {
    q: 'What is the difference between Gross and Tare?',
    a: 'Gross = weight of vehicle with material. Tare = weight of empty vehicle. Net = Gross - Tare = actual material weight.'
  },
  {
    q: 'How do I print a ticket?',
    a: 'Once both Gross and Tare are captured, the ticket becomes Complete and the Print button activates. Click "🖨️ Print Ticket".'
  },
  {
    q: 'Will data be lost if the software closes?',
    a: 'No. All data is saved on this computer. Simply restart the software and all data will be available.'
  },
  {
    q: 'Does the software work without internet?',
    a: 'Yes. The software works fully offline. Only EOD email and server sync require internet.'
  },
  {
    q: 'How do I view reports?',
    a: 'Click "📊 Reports" in the left menu. Select Daily, Monthly, or Search tab and enter the date range.'
  },
  {
    q: 'I forgot my PIN. What do I do?',
    a: 'Contact your Admin. Admin can reset your PIN from Settings → Users.'
  },
]

const HOWTO = [
  {
    title: 'Complete a weighing entry',
    steps: [
      'Enter vehicle number in the Vehicle No. field',
      'Select material from the Material field',
      'Vehicle drives onto weighbridge',
      'Wait for 🟢 Stable indicator',
      'Click ⬇️ Capture GROSS',
      'Vehicle unloads and returns empty',
      'Wait for 🟢 Stable indicator',
      'Click ⬇️ Capture TARE',
      'Net weight calculates automatically',
      'Click 💾 Save & Complete',
      'Click 🖨️ Print Ticket',
    ]
  },
  {
    title: 'Handle multiple trucks simultaneously',
    steps: [
      'Truck A arrives → Capture Gross → Click 💾 Save Pending',
      'Truck B arrives → Capture Gross → Click 💾 Save Pending',
      'Truck A returns empty → Click ⏳ Pending tab',
      'Click on Truck A\'s pending ticket to open it',
      'Capture Tare → Save & Complete → Print',
      'Repeat for Truck B',
    ]
  },
  {
    title: 'Use known tare weight',
    steps: [
      'If truck\'s empty weight is already known, enter vehicle number',
      'Tare weight auto-fills from vehicle master',
      'Only capture Gross weight',
      'Net calculates immediately',
      'Save & Complete in one visit',
    ]
  },
]

const SHORTCUTS = [

  { key: 'Tab',              action: 'Move to next field'        },
  { key: 'Enter',            action: 'Confirm / Submit'          },
  { key: 'Backspace',        action: 'Delete last PIN digit'     },
  { key: '0-9 keys',         action: 'Enter PIN from keyboard'   },
]

export default function HelpScreen() {
  const [tab,      setTab]      = useState('faq_gu')
  const [openFaq,  setOpenFaq]  = useState(null)

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8,
            fontSize: 13, cursor: 'pointer', border: '1.5px solid',
            fontWeight: tab === t.id ? 700 : 400,
            background:  tab === t.id ? '#1a1a2e' : 'white',
            borderColor: tab === t.id ? '#1a1a2e' : '#e0e0e0',
            color:       tab === t.id ? 'white'   : '#333',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── FAQ Gujarati ── */}
      {tab === 'faq_gu' && (
        <div>
          <div style={{
            background: '#f0fdf9', border: '1px solid #00d4aa',
            borderRadius: 10, padding: '12px 18px',
            fontSize: 14, color: '#00a37a', marginBottom: 16,
            fontFamily: 'sans-serif',
          }}>
            🙏 સામાન્ય પ્રશ્નો — ગુજરાતી ભાષામાં
          </div>
          {FAQ_GUJARATI.map((item, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 10,
              border: `1.5px solid ${openFaq === i ? '#e94560' : '#e0e0e0'}`,
              marginBottom: 8, overflow: 'hidden',
            }}>
              <div
                onClick={() => toggleFaq(i)}
                style={{
                  padding: '14px 18px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center',
                  background: openFaq === i ? '#fff5f7' : 'white',
                }}
              >
                <span style={{
                  fontWeight: 600, fontSize: 14,
                  color: openFaq === i ? '#e94560' : '#1a1a2e',
                  fontFamily: 'sans-serif',
                }}>
                  {item.q}
                </span>
                <span style={{ fontSize: 18, color: '#ccc' }}>
                  {openFaq === i ? '▲' : '▼'}
                </span>
              </div>
              {openFaq === i && (
                <div style={{
                  padding: '12px 18px 16px',
                  fontSize: 14, color: '#555',
                  borderTop: '1px solid #f5f5f5',
                  lineHeight: 1.7,
                  fontFamily: 'sans-serif',
                }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── FAQ English ── */}
      {tab === 'faq_en' && (
        <div>
          {FAQ_ENGLISH.map((item, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 10,
              border: `1.5px solid ${openFaq === i ? '#e94560' : '#e0e0e0'}`,
              marginBottom: 8, overflow: 'hidden',
            }}>
              <div
                onClick={() => toggleFaq(i)}
                style={{
                  padding: '14px 18px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center',
                  background: openFaq === i ? '#fff5f7' : 'white',
                }}
              >
                <span style={{
                  fontWeight: 600, fontSize: 14,
                  color: openFaq === i ? '#e94560' : '#1a1a2e',
                }}>
                  {item.q}
                </span>
                <span style={{ fontSize: 18, color: '#ccc' }}>
                  {openFaq === i ? '▲' : '▼'}
                </span>
              </div>
              {openFaq === i && (
                <div style={{
                  padding: '12px 18px 16px',
                  fontSize: 14, color: '#555',
                  borderTop: '1px solid #f5f5f5',
                  lineHeight: 1.7,
                }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── How To ── */}
      {tab === 'howto' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {HOWTO.map((section, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 10,
              padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>
              <div style={{
                fontWeight: 700, fontSize: 15,
                color: '#1a1a2e', marginBottom: 14,
              }}>
                📋 {section.title}
              </div>
              {section.steps.map((step, j) => (
                <div key={j} style={{
                  display: 'flex', gap: 12,
                  alignItems: 'flex-start',
                  marginBottom: 10,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#e94560', color: 'white',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12,
                    fontWeight: 700, flexShrink: 0,
                  }}>
                    {j + 1}
                  </div>
                  <div style={{ fontSize: 14, color: '#555', paddingTop: 3 }}>
                    {step}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Shortcuts ── */}
      {tab === 'shortcuts' && (
        <div style={{
          background: 'white', borderRadius: 10,
          padding: '20px 24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#aaa',
            letterSpacing: 1, textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Keyboard Shortcuts
          </div>
          {SHORTCUTS.map(({ key, action }) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #f5f5f5',
            }}>
              <span style={{ fontSize: 14, color: '#555' }}>{action}</span>
              <kbd style={{
                background: '#1a1a2e', color: 'white',
                padding: '4px 10px', borderRadius: 6,
                fontSize: 12, fontFamily: 'monospace',
                fontWeight: 600,
              }}>
                {key}
              </kbd>
            </div>
          ))}
        </div>
      )}

      {/* ── Support / Contact ── */}
      {tab === 'contact' && (
        <div style={{
          background: 'white', borderRadius: 10,
          padding: '32px', textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍💻</div>
          <h3 style={{ margin: '0 0 6px', color: '#1a1a2e' }}>
            Shabbir Yahya
          </h3>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
            Weighbridge Management System Developer
          </p>
          {[
            ['📱 WhatsApp / Phone', '+91 9574713452'],
            ['📧 Email', 'shabbir@saifenterprise.com'],
            ['🌐 Website', 'saifenterprise.com'],
            ['🕐 Support Hours', 'Mon–Sat, 9 AM – 6 PM'],
            ['⚡ Response Time', 'Within 24 hours'],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid #f5f5f5',
              fontSize: 14,
            }}>
              <span style={{ color: '#666' }}>{label}</span>
              <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{value}</span>
            </div>
          ))}
          <div style={{
            marginTop: 24, background: '#f0fdf9',
            border: '1px solid #00d4aa', borderRadius: 8,
            padding: '12px 16px', fontSize: 13, color: '#00a37a',
          }}>
            💡 When contacting support, please share your
            <strong> Ticket Number</strong> and a
            <strong> screenshot</strong> of the issue.
          </div>
        </div>
      )}

    </div>
  )
}