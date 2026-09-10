import { Calculator, PackagePlus, History as HistoryIcon, BarChart3, HelpCircle } from 'lucide-react'
import logo from '../assets/logo.jpeg'

export default function Sidebar({ activePage, setActivePage }) {
  const navBtn = (isActive) => ({
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    border: isActive ? '1px solid #B9972E' : '1px solid transparent',
    cursor: 'pointer',
    background: isActive ? '#3E2723' : 'transparent',
    color: isActive ? '#FFD54F' : '#8D6E63',
    transition: 'all 0.15s ease',
  })

  const fullBtn = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    borderRadius: '10px',
    border: isActive ? '1px solid #B9972E' : '1px solid transparent',
    cursor: 'pointer',
    background: isActive ? '#3E2723' : 'transparent',
    color: isActive ? '#FFD54F' : '#5D4037',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.86rem',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  })

  return (
    <aside style={{
      width: '190px',
      background: '#FFFBF5',
      borderRight: '1px solid #E9D9B8',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 10px',
      gap: '14px',
      flexShrink: 0,
    }}>
      <img src={logo} alt="Meenatchi" title="Meenatchi Footwear" style={{ width: '100%', height: 'auto', maxHeight: '64px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #D7C0A0', background: '#fff' }} />
      <div style={{ height: '1px', background: '#E9D9B8' }} />
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button onClick={() => setActivePage('billing')} style={fullBtn(activePage === 'billing')}><Calculator size={16} /> Billing</button>
        <button onClick={() => setActivePage('master')} style={fullBtn(activePage === 'master')}><PackagePlus size={16} /> Master</button>
        <button onClick={() => setActivePage('history')} style={fullBtn(activePage === 'history')}><HistoryIcon size={16} /> History</button>
        <button onClick={() => setActivePage('analytics')} style={fullBtn(activePage === 'analytics')}><BarChart3 size={16} /> Analytics</button>
        <button onClick={() => setActivePage('help')} style={fullBtn(activePage === 'help')}><HelpCircle size={16} /> Help</button>
      </nav>
      <div style={{ marginTop: 'auto', padding: '10px', borderRadius: '10px', background: '#FFF3D6', border: '1px solid #E9D9B8', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#3E2723' }}>HID Scanner</div>
        <div style={{ fontSize: '10px', color: '#8D6E63' }}>Ready • Scan barcode</div>
      </div>
    </aside>
  )
}
