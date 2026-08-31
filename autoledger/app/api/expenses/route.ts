import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    // Employees only see their own expenses
    if (session.role !== 'ADMIN') {
      where.userId = session.userId
    }
    if (status) where.status = status
    if (category) where.category = category

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          receipt: true,
          user: { select: { name: true, email: true, department: true } },
          review: { include: { admin: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ])

    return NextResponse.json({ expenses, total, page, limit })
  } catch (error) {
    console.error('[GET Expenses]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const expense = await prisma.expense.create({
      data: {
        userId: session.userId,
        merchant: body.merchant,
        amount: body.amount,
        tax: body.tax || 0,
        currency: body.currency || 'INR',
        date: body.date,
        category: body.category || 'Other',
        description: body.description || '',
        status: 'EXTRACTED',
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('[POST Expense]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
