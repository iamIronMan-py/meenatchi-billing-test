import { Calculator, PackagePlus, History as HistoryIcon, BarChart3, HelpCircle, Users, LogOut } from 'lucide-react'
import logo from '../assets/logo.jpeg'

export default function Sidebar({ activePage, setActivePage, currentUser, onLogout, canAccess }) {
  const role = currentUser?.type || 'guest'

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

  const navItems = [
    { page: 'billing', icon: <Calculator size={16} />, label: 'Billing' },
    { page: 'master', icon: <PackagePlus size={16} />, label: 'Master', adminOnly: true },
    { page: 'history', icon: <HistoryIcon size={16} />, label: 'History' },
    { page: 'analytics', icon: <BarChart3 size={16} />, label: 'Analytics', noGuest: true },
    { page: 'users', icon: <Users size={16} />, label: 'Users', adminOnly: true },
    { page: 'help', icon: <HelpCircle size={16} />, label: 'Help' },
  ]

  const filteredNav = navItems.filter(item => {
    if (item.adminOnly && role !== 'admin') return false
    if (item.noGuest && role === 'guest') return false
    return true
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
        {filteredNav.map(item => (
          <button key={item.page} onClick={() => setActivePage(item.page)} style={fullBtn(activePage === item.page)}>
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ padding: '8px 10px', borderRadius: '10px', background: '#FFF3D6', border: '1px solid #E9D9B8' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#3E2723' }}>{currentUser?.username}</div>
          <div style={{ fontSize: '10px', color: '#8D6E63', textTransform: 'capitalize' }}>{role}</div>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: '10px', background: '#FFF3D6', border: '1px solid #E9D9B8', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#3E2723' }}>HID Scanner</div>
          <div style={{ fontSize: '10px', color: '#8D6E63' }}>Ready • Scan barcode</div>
        </div>
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '8px 10px', borderRadius: '10px', border: '1px solid #E9D9B8',
          background: '#fff', color: '#8D2E00', fontSize: '11px', fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.15s ease', width: '100%',
        }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
