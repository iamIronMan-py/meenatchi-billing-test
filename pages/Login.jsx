import { useState } from 'react'
import { db } from '../services/db'
import logo from '../assets/logo.jpeg'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password')
      return
    }
    setLoading(true)
    await db.seedDefaultUsers()
    const session = await db.authenticate(username.trim(), password)
    setLoading(false)
    if (session) {
      onLogin(session)
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #3E2723 0%, #5D4037 50%, #3E2723 100%)',
    }}>
      <div style={{
        width: '380px',
        background: '#FFFBF5',
        borderRadius: '20px',
        border: '1px solid #E9D9B8',
        boxShadow: '0 20px 60px rgba(62,39,35,0.3)',
        padding: '40px 36px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}>
        <img
          src={logo}
          alt="Meenatchi Footwear"
          style={{
            width: '140px',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '14px',
            border: '2px solid #D7C0A0',
            background: '#fff',
            padding: '6px',
          }}
        />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#3E2723', letterSpacing: '-0.02em' }}>
            Meenatchi Footwear
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8D6E63' }}>
            Billing System — Sign In
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              background: '#FFF0E0',
              border: '1px solid #E9D9B8',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#8D2E00',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', display: 'block' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #E9D9B8',
                background: '#fff',
                fontSize: '13px',
                color: '#3E2723',
                outline: 'none',
                fontFamily: 'var(--font-family)',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#B9972E'; e.target.style.boxShadow = '0 0 0 2px rgba(185,151,46,0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = '#E9D9B8'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', display: 'block' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #E9D9B8',
                background: '#fff',
                fontSize: '13px',
                color: '#3E2723',
                outline: 'none',
                fontFamily: 'var(--font-family)',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#B9972E'; e.target.style.boxShadow = '0 0 0 2px rgba(185,151,46,0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = '#E9D9B8'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 0',
              borderRadius: '10px',
              border: 'none',
              background: loading ? '#BC9A7A' : '#3E2723',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'var(--font-family)',
              transition: 'background 0.15s',
              marginTop: '4px',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '10px', color: '#BC9A7A' }}>
            Default: admin / admin123
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#BC9A7A' }}>
            cashier / cashier123 &nbsp;|&nbsp; guest / guest123
          </p>
        </div>
      </div>
    </div>
  )
}
