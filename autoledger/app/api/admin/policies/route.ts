import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const policies = await prisma.policy.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ policies })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const policy = await prisma.policy.create({
    data: {
      name: body.name,
      category: body.category,
      maxAmount: body.maxAmount,
      currency: body.currency || 'INR',
      description: body.description || '',
      isActive: true,
    },
  })
  return NextResponse.json({ policy }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.policy.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
