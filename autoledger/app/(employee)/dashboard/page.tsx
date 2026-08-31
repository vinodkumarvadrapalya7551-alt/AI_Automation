import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor, getCategoryIcon } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const [expenses, analytics] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: session.userId },
      include: { receipt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    Promise.all([
      prisma.expense.count({ where: { userId: session.userId } }),
      prisma.expense.count({ where: { userId: session.userId, status: 'APPROVED' } }),
      prisma.expense.count({ where: { userId: session.userId, status: 'PENDING' } }),
      prisma.expense.count({ where: { userId: session.userId, status: 'FLAGGED' } }),
      prisma.expense.count({ where: { userId: session.userId, status: 'REJECTED' } }),
      prisma.expense.aggregate({
        where: { userId: session.userId, status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ]),
  ])

  const [total, approved, pending, flagged, rejected, sumResult] = analytics
  const totalAmount = sumResult._sum.amount || 0

  const stats = [
    { label: 'Total Submitted', value: total, icon: '📋', color: '#6366f1' },
    { label: 'Approved', value: approved, icon: '✅', color: '#10b981' },
    { label: 'Flagged', value: flagged, icon: '⚠️', color: '#f59e0b' },
    { label: 'Rejected', value: rejected, icon: '❌', color: '#ef4444' },
  ]

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
          Good day, {session.name.split(' ')[0]} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Here&apos;s an overview of your expense submissions
        </p>
      </div>

      {/* Reimbursable amount banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 16, padding: '20px 28px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Approved Amount</div>
          <div style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatCurrency(totalAmount)}
          </div>
        </div>
        <Link href="/expenses/upload" className="btn-primary">
          + Upload Receipt
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent expenses */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Expenses</h2>
          <Link href="/expenses" style={{ fontSize: 13, color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
            View All →
          </Link>
        </div>

        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No expenses yet</div>
            <Link href="/expenses/upload" className="btn-primary" style={{ display: 'inline-flex', marginTop: 8 }}>
              Upload Your First Receipt
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>AI Confidence</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => {
                const flagReasons = JSON.parse(exp.flagReasons || '[]')
                return (
                  <tr key={exp.id} style={{ cursor: 'pointer' }}>
                    <td>
                      <Link href={`/expenses/${exp.id}`} style={{ color: '#f1f5f9', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
                        {getCategoryIcon(exp.category)} {exp.merchant}
                      </Link>
                    </td>
                    <td>{exp.category}</td>
                    <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{formatCurrency(exp.amount, exp.currency)}</td>
                    <td>{formatDate(exp.date)}</td>
                    <td>
                      <span className={`badge ${getStatusColor(exp.status)}`}>{exp.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="confidence-bar" style={{ width: 60 }}>
                          <div className="confidence-bar-fill" style={{
                            width: `${exp.confidenceScore}%`,
                            background: exp.confidenceScore >= 85 ? '#10b981' : exp.confidenceScore >= 70 ? '#f59e0b' : '#ef4444',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{exp.confidenceScore}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
