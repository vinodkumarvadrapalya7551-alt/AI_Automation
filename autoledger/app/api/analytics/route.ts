import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = session.role === 'ADMIN'
    const userFilter = isAdmin ? {} : { userId: session.userId }

    // Summary stats
    const [total, approved, rejected, flagged, pending] = await Promise.all([
      prisma.expense.count({ where: userFilter }),
      prisma.expense.count({ where: { ...userFilter, status: 'APPROVED' } }),
      prisma.expense.count({ where: { ...userFilter, status: 'REJECTED' } }),
      prisma.expense.count({ where: { ...userFilter, status: 'FLAGGED' } }),
      prisma.expense.count({ where: { ...userFilter, status: { in: ['PROCESSING', 'EXTRACTED', 'VALIDATING'] } } }),
    ])

    // Total amounts
    const approvedExpenses = await prisma.expense.findMany({
      where: { ...userFilter, status: 'APPROVED' },
      select: { amount: true, tax: true },
    })
    const totalApprovedAmount = approvedExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalTax = approvedExpenses.reduce((sum, e) => sum + e.tax, 0)

    // By category
    const byCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: { ...userFilter, status: 'APPROVED' },
      _sum: { amount: true },
      _count: true,
    })

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const monthlyExpenses = await prisma.expense.findMany({
      where: {
        ...userFilter,
        status: 'APPROVED',
        createdAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, createdAt: true },
    })

    // Group by month
    const monthlyMap: Record<string, number> = {}
    for (const exp of monthlyExpenses) {
      const monthKey = exp.createdAt.toISOString().substring(0, 7) // YYYY-MM
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + exp.amount
    }
    const monthly = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // By department (admin only)
    let byDepartment: Array<{ department: string; amount: number; count: number }> = []
    if (isAdmin) {
      const deptData = await prisma.expense.findMany({
        where: { status: 'APPROVED' },
        include: { user: { select: { department: true } } },
      })
      const deptMap: Record<string, { amount: number; count: number }> = {}
      for (const exp of deptData) {
        const dept = exp.user.department
        if (!deptMap[dept]) deptMap[dept] = { amount: 0, count: 0 }
        deptMap[dept].amount += exp.amount
        deptMap[dept].count += 1
      }
      byDepartment = Object.entries(deptMap).map(([department, data]) => ({
        department,
        ...data,
      }))
    }

    return NextResponse.json({
      summary: { total, approved, rejected, flagged, pending, totalApprovedAmount, totalTax },
      byCategory: byCategory.map(c => ({
        category: c.category,
        amount: c._sum.amount || 0,
        count: c._count,
      })),
      monthly,
      byDepartment,
    })
  } catch (error) {
    console.error('[Analytics]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
