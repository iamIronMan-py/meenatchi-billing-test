import { Keyboard, Zap, Info } from 'lucide-react'

const shortcuts = [
  { section:'Navigation (Alt + key)', icon: <Zap size={13} color="#B9972E"/>, rows:[
    ['Alt + B', 'Go to Billing'],
    ['Alt + M', 'Go to Master'],
    ['Alt + H', 'Go to History'],
    ['Alt + A', 'Go to Analytics'],
    ['Alt + ? / Alt+5', 'Open this Help'],
    ['F1', 'Open Help'],
  ]},
  { section:'Billing', icon: null, rows:[
    ['F2', 'Focus Search / Scan box (HID ready)'],
    ['Enter', 'Add exact barcode match or top suggestion'],
    ['Tab', 'Move fields: Qty → Discount → Phone → Name → Cash → Checkout'],
    ['Shift + Tab', 'Go back one field'],
    ['F4 / Ctrl+Enter', 'Checkout & Print'],
    ['F5', 'Hold — save current billing as draft, start fresh'],
    ['F6', 'Recall — restore last held draft'],
    ['F7', 'Drafts — open/close held drafts panel'],
    ['Esc', 'Clear search / Close modal'],
    ['Click Qty', 'Edit quantity inline (Enter to confirm)'],
  ]},
  { section:'Master', icon: null, rows:[
    ['Tab', 'Name → Type → Brand → Size → Barcode → Price → SGST → CGST → Save'],
    ['Enter on Barcode', 'Jump to Price (HID flow)'],
    ['Ctrl+S', 'Save product (when form focused)'],
  ]},
]

const tips = [
  'USB HID scanner acts as keyboard. Keep cursor in Scan/Search, scan — auto-adds.',
  'Product Type (Mens/Women/Kids) drives Analytics trends & filters.',
  'Phone + Name saved per bill → loyalty points (1 pt / ₹100) for future discounts.',
  'Hold (F5) a billing to serve another customer, Recall (F6) later. Drafts panel (F7) shows all held bills.',
  'Discount is applied BEFORE GST. Master sets daily discount; cashier can override at billing.',
  'Excel Import: columns must be Name, Price, Barcode, Brand, Size, Category.',
]

export default function Help() {
  return (
    <div className="page-root" style={{ overflow:'auto' }}>
      <header className="page-header">
        <h2 className="header-title" style={{ display:'flex', alignItems:'center', gap:'8px' }}><Keyboard size={16} color="#B9972E"/> Shortcuts & Help</h2>
        <p className="text-sm">Microsoft-like Alt+Tab navigation • Fast billing without mouse</p>
      </header>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'10px', flex:'1' }}>
        {shortcuts.map((group, gi) => (
          <div key={gi} className="card" style={{ padding:'10px 12px' }}>
            <div style={{ fontWeight:700, fontSize:'12px', color:'var(--text-primary)', marginBottom:'6px', display:'flex', alignItems:'center', gap:'6px' }}>
              {group.icon || <span style={{width:13}}/>} {group.section}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <tbody>
                {group.rows.map(([k, desc], ri) => (
                  <tr key={ri} style={{ borderBottom:'1px solid #FFF3D6' }}>
                    <td style={{ padding:'5px 8px', fontFamily:'monospace', fontWeight:700, color:'var(--text-primary)', fontSize:'11px', whiteSpace:'nowrap', verticalAlign:'top' }}>{k}</td>
                    <td style={{ padding:'5px 8px', color:'var(--text-secondary)', fontSize:'11px' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="card" style={{ padding:'10px 12px', background:'var(--bg-tertiary)' }}>
          <div style={{ fontWeight:700, fontSize:'12px', color:'var(--text-primary)', marginBottom:'6px', display:'flex', alignItems:'center', gap:'6px' }}><Info size={13}/> Tips</div>
          <ul style={{ margin:0, paddingLeft:'16px', display:'flex', flexDirection:'column', gap:'4px' }}>
            {tips.map((t, i) => (
              <li key={i} style={{ color:'var(--text-secondary)', fontSize:'11px', lineHeight:'1.4' }}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ padding:'8px 12px', border:'1px dashed var(--border-color)', borderRadius:'10px', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-secondary)' }}>
        Inspired by Tally, Vyapar, Marg — simple top bar navigation, Tab to next field, F-keys for billing speed.
      </div>
    </div>
  )
}
