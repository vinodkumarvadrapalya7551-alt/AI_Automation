import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'APPROVED'
    const department = searchParams.get('department') || ''

    const where: Record<string, unknown> = { status }
    if (department) {
      // Filter through user relation
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, department: true } },
        review: { include: { admin: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Build CSV
    const headers = [
      'ID', 'Employee', 'Email', 'Department', 'Merchant', 'Category',
      'Amount (INR)', 'Tax', 'Currency', 'Date', 'Status', 'Receipt No.',
      'Payment Method', 'AI Confidence', 'Submitted Date', 'Reviewed By'
    ]

    const rows = expenses.map(e => [
      e.id,
      e.user.name,
      e.user.email,
      e.user.department,
      e.merchant,
      e.category,
      e.amount.toFixed(2),
      e.tax.toFixed(2),
      e.currency,
      e.date,
      e.status,
      e.receiptNumber,
      e.paymentMethod,
      `${e.confidenceScore}%`,
      e.createdAt.toISOString().split('T')[0],
      e.review?.admin?.name || '',
    ])

    const csvLines = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    return new NextResponse(csvLines, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="autoledger-expenses-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('[Export]', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
