import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Billing from './pages/Billing'
import Master from './pages/Master'
import History from './pages/History'
import Analytics from './pages/Analytics'
import Help from './pages/Help'
import { db } from './services/db'
import { mockProducts, mockCustomers, mockDiscounts, generateMockInvoices } from './services/mockData'
import './index.css'

function App() {
  const [activePage, setActivePage] = useState('billing')
  const [invoiceItems, setInvoiceItems] = useState([])

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

  // Global shortcuts like Microsoft: Alt + B/M/H/A/? , F2/F4
  useEffect(() => {
    const handler = (e) => {
      const alt = e.altKey && !e.ctrlKey && !e.metaKey
      if (alt && e.key.toLowerCase() === 'b') { e.preventDefault(); setActivePage('billing') }
      if (alt && e.key.toLowerCase() === 'm') { e.preventDefault(); setActivePage('master') }
      if (alt && e.key.toLowerCase() === 'h') { e.preventDefault(); setActivePage('history') }
      if (alt && e.key.toLowerCase() === 'a') { e.preventDefault(); setActivePage('analytics') }
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
  }, [activePage])

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main style={{ flex: 1, overflow: 'hidden', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activePage === 'billing' && <Billing invoiceItems={invoiceItems} setInvoiceItems={setInvoiceItems} />}
          {activePage === 'master' && <Master />}
          {activePage === 'history' && <History />}
          {activePage === 'analytics' && <Analytics />}
          {activePage === 'help' && <Help />}
        </div>
      </main>
    </div>
  )
}
export default App
