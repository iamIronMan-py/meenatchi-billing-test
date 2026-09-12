import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Billing from './pages/Billing'
import Master from './pages/Master'
import History from './pages/History'
import Analytics from './pages/Analytics'
import Help from './pages/Help'
import Login from './pages/Login'
import Users from './pages/Users'
import { db } from './services/db'
import { mockProducts, mockCustomers, mockDiscounts, generateMockInvoices } from './services/mockData'
import './index.css'

function App() {
  const [activePage, setActivePage] = useState('billing')
  const [invoiceItems, setInvoiceItems] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Check existing session on mount
  useEffect(() => {
    (async () => {
      await db.seedDefaultUsers()
      const session = await db.getCurrentUser()
      if (session) setCurrentUser(session)
      setAuthChecked(true)
    })()
  }, [])

  // Seed sqlite-style mock DB on first load
  useEffect(() => {
    (async () => {
      const seeded = await db.isSeeded()
      const products = await db.getProducts()
      if (!seeded && products.length === 0) {
        const invoices = generateMockInvoices(mockProducts, mockCustomers)
        const prodsWithIds = mockProducts.map((p, i) => ({ id: 'mock-p-'+i, ...p }))
        await db.seedMock({ products: prodsWithIds, customers: mockCustomers, discounts: mockDiscounts.map((d,i)=> ({ id: 'mock-d-'+i, createdAt: new Date().toISOString(), isActive: i===0, ...d })), invoices })
      }
    })()
  }, [])

  const handleLogin = (session) => {
    setCurrentUser(session)
    setActivePage('billing')
  }

  const handleLogout = async () => {
    await db.logout()
    setCurrentUser(null)
    setActivePage('billing')
  }

  const role = currentUser?.type || 'guest'
  const isAdmin = role === 'admin'
  const isCashier = role === 'cashier'
  const isGuest = role === 'guest'

  // Guest: only billing + help | Cashier: everything except master edit | Admin: full
  const canAccess = (page) => {
    if (page === 'master' && !isAdmin) return false
    if (page === 'users' && !isAdmin) return false
    if (page === 'analytics' && isGuest) return false
    if (page === 'history' && isGuest) return false
    return true
  }

  // Global shortcuts like Microsoft: Alt + B/M/H/A/? , F2/F4
  useEffect(() => {
    if (!currentUser) return
    const handler = (e) => {
      const alt = e.altKey && !e.ctrlKey && !e.metaKey
      if (alt && e.key.toLowerCase() === 'b') { e.preventDefault(); if (canAccess('billing')) setActivePage('billing') }
      if (alt && e.key.toLowerCase() === 'm') { e.preventDefault(); if (canAccess('master')) setActivePage('master') }
      if (alt && e.key.toLowerCase() === 'h') { e.preventDefault(); if (canAccess('history')) setActivePage('history') }
      if (alt && e.key.toLowerCase() === 'a') { e.preventDefault(); if (canAccess('analytics')) setActivePage('analytics') }
      if (alt && (e.key === '?' || e.key === '5' || e.key.toLowerCase() === 'k')) { e.preventDefault(); setActivePage('help') }
      if (e.key === 'F1') { e.preventDefault(); setActivePage('help') }
      if (e.key === 'F2' && activePage === 'billing') {
        e.preventDefault(); document.querySelector('input[placeholder*="Scan barcode"]')?.focus()
      }
      if ((e.key === 'F4' || (e.ctrlKey && e.key === 'Enter')) && activePage === 'billing') {
        document.dispatchEvent(new CustomEvent('billing:checkout'))
      }
      if (e.key === 'F5' && activePage === 'billing') {
        e.preventDefault(); document.dispatchEvent(new CustomEvent('billing:hold'))
      }
      if (e.key === 'F6' && activePage === 'billing') {
        e.preventDefault(); document.dispatchEvent(new CustomEvent('billing:recall-last'))
      }
      if (e.key === 'F7' && activePage === 'billing') {
        e.preventDefault(); document.dispatchEvent(new CustomEvent('billing:toggle-drafts'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activePage, currentUser])

  if (!authChecked) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3E2723' }}>
        <div style={{ color: '#FFD54F', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} currentUser={currentUser} onLogout={handleLogout} canAccess={canAccess} />
      <main style={{ flex: 1, overflow: 'hidden', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activePage === 'billing' && <Billing invoiceItems={invoiceItems} setInvoiceItems={setInvoiceItems} currentUser={currentUser} />}
          {activePage === 'master' && isAdmin && <Master />}
          {activePage === 'history' && <History />}
          {activePage === 'analytics' && <Analytics />}
          {activePage === 'help' && <Help />}
          {activePage === 'users' && isAdmin && <Users currentUser={currentUser} />}
        </div>
      </main>
    </div>
  )
}
export default App
