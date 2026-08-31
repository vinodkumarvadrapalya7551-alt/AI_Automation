import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function adminAction(
  req: NextRequest,
  params: Promise<{ id: string }>,
  action: 'approve' | 'reject' | 'flag'
) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const reason = body.reason || ''

  const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'FLAGGED'

  const updated = await prisma.expense.update({
    where: { id },
    data: { status },
  })

  // Create review record
  if (action === 'approve' || action === 'reject') {
    await prisma.review.upsert({
      where: { expenseId: id },
      create: {
        expenseId: id,
        adminId: session.userId,
        decision: status,
        reason,
      },
      update: {
        adminId: session.userId,
        decision: status,
        reason,
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: `ADMIN_${action.toUpperCase()}_EXPENSE`,
      resource: `expense:${id}`,
      metadata: JSON.stringify({ reason, previousStatus: expense.status }),
    },
  })

  return NextResponse.json({ expense: updated, action, reason })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; action: string }> }
) {
  const { action } = await context.params
  if (!['approve', 'reject', 'flag'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  return adminAction(req, context.params, action as 'approve' | 'reject' | 'flag')
}
