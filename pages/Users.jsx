import { useState, useEffect } from 'react'
import { Users as UsersIcon, Plus, Trash2, Edit3, X, Shield, Eye } from 'lucide-react'
import { db } from '../services/db'

const USER_TYPES = [
  { value: 'admin', label: 'Admin', desc: 'Full access — manage users, discounts, products, everything', color: '#8D2E00' },
  { value: 'cashier', label: 'Cashier', desc: 'Billing, history, analytics — cannot edit master products', color: '#6D4C00' },
  { value: 'guest', label: 'Guest', desc: 'View-only access — billing and help only', color: '#3E2723' },
]

export default function Users({ currentUser }) {
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', type: 'cashier' })
  const [error, setError] = useState('')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    const list = await db.getUsers()
    setUsers(list)
  }

  const resetForm = () => {
    setForm({ username: '', password: '', type: 'cashier' })
    setEditingUser(null)
    setError('')
    setShowForm(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username.trim()) { setError('Username is required'); return }
    if (!editingUser && !form.password.trim()) { setError('Password is required'); return }
    if (editingUser && form.password && form.password.length < 4) { setError('Password must be at least 4 characters'); return }

    if (editingUser) {
      const updates = { type: form.type }
      if (form.password.trim()) updates.password = form.password
      await db.updateUser(editingUser.id, updates)
    } else {
      const result = await db.addUser({ username: form.username.trim(), password: form.password, type: form.type })
      if (!result) { setError('Username already exists'); return }
    }
    resetForm()
    loadUsers()
  }

  const handleDelete = async (user) => {
    if (user.id === currentUser.id) { alert('Cannot delete your own account'); return }
    if (window.confirm(`Delete user "${user.username}"?`)) {
      await db.deleteUser(user.id)
      loadUsers()
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setForm({ username: user.username, password: '', type: user.type })
    setShowForm(true)
  }

  return (
    <div className="page-root">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UsersIcon size={18} /> User Management
          </h1>
          <p className="text-sm" style={{ margin: '2px 0 0' }}>Manage login accounts and roles</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus size={14} style={{ marginRight: '4px' }} /> Add User
        </button>
      </div>

      <div className="page-body" style={{ overflow: 'auto' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#3E2723', color: '#FFD54F' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Username</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Access</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Created</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const typeInfo = USER_TYPES.find(t => t.value === user.type) || USER_TYPES[2]
                const isCurrentUser = user.id === currentUser.id
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #E9D9B8', background: isCurrentUser ? '#FFF8EE' : '#fff' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#3E2723' }}>
                      {user.username}
                      {isCurrentUser && <span style={{ fontSize: '10px', color: '#B9972E', marginLeft: '6px' }}>(you)</span>}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', borderRadius: '6px',
                        background: typeInfo.color + '15', color: typeInfo.color,
                        fontSize: '11px', fontWeight: 600,
                      }}>
                        {user.type === 'admin' ? <Shield size={11} /> : user.type === 'guest' ? <Eye size={11} /> : null}
                        {typeInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#8D6E63', fontSize: '11px' }}>{typeInfo.desc}</td>
                    <td style={{ padding: '8px 12px', color: '#8D6E63' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button onClick={() => handleEdit(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B9972E', padding: '4px' }} title="Edit">
                        <Edit3 size={14} />
                      </button>
                      {!isCurrentUser && (
                        <button onClick={() => handleDelete(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8D2E00', padding: '4px', marginLeft: '4px' }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <div style={{ padding: '30px', textAlign: 'center', color: '#BC9A7A' }}>No users found</div>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(62,39,35,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={(e) => { if (e.target === e.currentTarget) resetForm() }}>
          <div className="card" style={{ width: '380px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="section-title" style={{ fontSize: '14px' }}>{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8D6E63' }}><X size={16} /></button>
            </div>

            {error && (
              <div style={{ background: '#FFF0E0', border: '1px solid #E9D9B8', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#8D2E00', marginBottom: '12px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label>Username</label>
                <input
                  className="input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. john"
                  disabled={!!editingUser}
                  style={editingUser ? { background: '#f5f5f5', color: '#999' } : {}}
                />
              </div>
              <div>
                <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingUser ? '••••••' : 'Enter password'}
                />
              </div>
              <div>
                <label>Role</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {USER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button type="button" className="btn-secondary" onClick={resetForm} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
