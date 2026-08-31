import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      receipt: true,
      user: { select: { name: true, email: true, department: true } },
      review: { include: { admin: { select: { name: true } } } },
    },
  })

  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.role !== 'ADMIN' && expense.userId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ expense })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.role !== 'ADMIN' && expense.userId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updated = await prisma.expense.update({
    where: { id },
    data: {
      merchant: body.merchant,
      amount: body.amount,
      tax: body.tax,
      currency: body.currency,
      date: body.date,
      category: body.category,
      description: body.description,
    },
  })

  return NextResponse.json({ expense: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.role !== 'ADMIN' && expense.userId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
