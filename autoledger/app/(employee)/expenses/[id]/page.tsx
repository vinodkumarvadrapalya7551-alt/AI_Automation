import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor, getCategoryIcon } from '@/lib/utils'

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return null

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      receipt: true,
      user: { select: { name: true, email: true, department: true } },
      review: { include: { admin: { select: { name: true } } } },
    },
  })

  if (!expense) notFound()
  if (session.role !== 'ADMIN' && expense.userId !== session.userId) notFound()

  const flagReasons: string[] = JSON.parse(expense.flagReasons || '[]')

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/expenses" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          ← Back to Expenses
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
              {getCategoryIcon(expense.category)} {expense.merchant}
            </h1>
            <span className={`badge ${getStatusColor(expense.status)}`}>{expense.status}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9' }}>{formatCurrency(expense.amount, expense.currency)}</div>
            {expense.tax > 0 && <div style={{ fontSize: 13, color: '#64748b' }}>+ {formatCurrency(expense.tax)} tax</div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Main info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#94a3b8' }}>EXPENSE DETAILS</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Category', value: `${getCategoryIcon(expense.category)} ${expense.category}` },
                { label: 'Date', value: formatDate(expense.date) },
                { label: 'Currency', value: expense.currency },
                { label: 'Receipt #', value: expense.receiptNumber || '—' },
                { label: 'Payment', value: expense.paymentMethod || '—' },
                { label: 'Description', value: expense.description || '—' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(99,102,241,0.06)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Receipt image */}
          {expense.receipt && (
            <div className="glass-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#94a3b8' }}>RECEIPT</h2>
              {expense.receipt.fileType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={expense.receipt.fileUrl} alt="Receipt" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }} />
              ) : (
                <a href={expense.receipt.fileUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'block', padding: '20px', textAlign: 'center', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                  📄 Open PDF Receipt
                </a>
              )}
            </div>
          )}
        </div>

        {/* AI Analysis panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Confidence */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#94a3b8' }}>🤖 AI ANALYSIS</h2>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Extraction Confidence</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: expense.confidenceScore >= 85 ? '#10b981' : expense.confidenceScore >= 70 ? '#f59e0b' : '#ef4444' }}>
                  {expense.confidenceScore}%
                </span>
              </div>
              <div className="confidence-bar">
                <div className="confidence-bar-fill" style={{
                  width: `${expense.confidenceScore}%`,
                  background: expense.confidenceScore >= 85 ? 'linear-gradient(90deg,#059669,#10b981)' : expense.confidenceScore >= 70 ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#dc2626,#ef4444)',
                }} />
              </div>
            </div>

            {/* AI Reasoning */}
            {expense.aiReasoning && (
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>AI Reasoning</div>
                <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)', fontSize: 12, color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {expense.aiReasoning}
                </div>
              </div>
            )}
          </div>

          {/* Flags */}
          {flagReasons.length > 0 && (
            <div className="glass-card" style={{ padding: 24, borderColor: 'rgba(245,158,11,0.2)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#f59e0b' }}>⚠️ WHY WAS THIS FLAGGED?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {flagReasons.map((reason: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <span style={{ color: '#f59e0b', fontSize: 14, flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: 13, color: '#fcd34d' }}>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review result */}
          {expense.review && (
            <div className="glass-card" style={{ padding: 24, borderColor: expense.review.decision === 'APPROVED' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#94a3b8' }}>📋 ADMIN REVIEW</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Decision</span>
                  <span className={`badge ${getStatusColor(expense.review.decision)}`}>{expense.review.decision}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Reviewed by</span>
                  <span style={{ fontSize: 13, color: '#f1f5f9' }}>{expense.review.admin.name}</span>
                </div>
                {expense.review.reason && (
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Note</div>
                    <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', fontSize: 12, color: '#94a3b8' }}>
                      {expense.review.reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
