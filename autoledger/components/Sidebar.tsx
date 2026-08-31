'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: string
}

const employeeNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '⬛' },
  { href: '/expenses/upload', label: 'Upload Expense', icon: '📤' },
  { href: '/expenses', label: 'My Expenses', icon: '📋' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: '⬛' },
  { href: '/admin/expenses', label: 'All Expenses', icon: '📋' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📊' },
  { href: '/admin/policies', label: 'Policies', icon: '📜' },
  { href: '/admin/employees', label: 'Employees', icon: '👥' },
  { href: '/admin/export', label: 'Export', icon: '📥' },
  { href: '/admin/audit', label: 'Audit Logs', icon: '🔍' },
]

interface SidebarProps {
  user: { name: string; email: string; role: string; department: string }
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = user.role === 'ADMIN' ? adminNav : employeeNav

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>⚡</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>AutoLedger</div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {user.role === 'ADMIN' ? 'Admin Panel' : 'Employee Portal'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 8 }}>
          Navigation
        </div>
        {nav.map(item => {
          const isActive = pathname === item.href || (item.href !== '/admin' && item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}
              style={isActive ? { borderLeft: '3px solid #6366f1', paddingLeft: 13 } : {}}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(99,102,241,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'white',
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.department}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
          color: '#f87171', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
        }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
