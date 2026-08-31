'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DEPARTMENTS } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'General', role: 'EMPLOYEE' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); return }
      if (data.user.role === 'ADMIN') router.push('/admin')
      else router.push('/dashboard')
      router.refresh()
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 80% 50%, rgba(139,92,246,0.07) 0%, transparent 60%), #080d1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ position: 'absolute', top: 32, left: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <span style={{ fontSize: 20, fontWeight: 700 }}>AutoLedger</span>
        </div>
      </div>

      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 460 }}>
        <div className="glass-card" style={{ padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Create Account</h1>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>Join AutoLedger to streamline your expenses</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>Full Name</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Smith" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>Department</label>
                <select className="input" style={{ cursor: 'pointer' }} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>Email Address</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>Password</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" minLength={6} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>Account Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {['EMPLOYEE', 'ADMIN'].map(r => (
                  <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                    style={{
                      padding: '10px 14px', borderRadius: 10, border: '1px solid',
                      borderColor: form.role === r ? '#6366f1' : 'rgba(99,102,241,0.15)',
                      background: form.role === r ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: form.role === r ? '#a78bfa' : '#64748b',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    {r === 'EMPLOYEE' ? '👤 Employee' : '🛡️ Admin'}
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4 }}>
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
