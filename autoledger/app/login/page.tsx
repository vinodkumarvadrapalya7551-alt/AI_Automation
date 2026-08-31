'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      if (data.user.role === 'ADMIN') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role: 'employee' | 'admin') => {
    if (role === 'admin') {
      setEmail('admin@autoledger.com')
      setPassword('admin123')
    } else {
      setEmail('john@autoledger.com')
      setPassword('employee123')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.05) 0%, transparent 60%), #080d1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Logo top left */}
      <div style={{ position: 'absolute', top: 32, left: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>⚡</div>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>AutoLedger</span>
        </div>
      </div>

      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 440 }}>
        {/* Card */}
        <div className="glass-card" style={{ padding: 40 }}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              Welcome back
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>
              Sign in to your AutoLedger account
            </p>
          </div>

          {/* Demo quick-fill */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
            <button
              type="button"
              onClick={() => fillDemo('employee')}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              👤 Demo Employee
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin')}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              🛡️ Demo Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>
                Email Address
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>
                Password
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : 'Sign In →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Register
            </Link>
          </p>
        </div>

        {/* Feature chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['🤖 AI Extraction', '🔍 Duplicate Detection', '📊 Analytics', '✅ Auto-Approval'].map(f => (
            <span key={f} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
              color: '#94a3b8',
            }}>{f}</span>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
