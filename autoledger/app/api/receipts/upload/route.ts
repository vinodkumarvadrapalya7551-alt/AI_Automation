import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
}

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate type
    const mimeType = file.type
    if (!ALLOWED_TYPES[mimeType]) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, PDF' }, { status: 400 })
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB' }, { status: 400 })
    }

    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Save file
    const ext = ALLOWED_TYPES[mimeType]
    const filename = `${uuidv4()}.${ext}`
    const filepath = path.join(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Create expense record (PROCESSING state)
    const expense = await prisma.expense.create({
      data: {
        userId: session.userId,
        merchant: 'Processing...',
        amount: 0,
        status: 'PROCESSING',
        date: new Date().toISOString().split('T')[0],
      },
    })

    // Create receipt record
    await prisma.receipt.create({
      data: {
        expenseId: expense.id,
        fileUrl: `/uploads/${filename}`,
        fileType: mimeType,
        fileSize: file.size,
      },
    })

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UPLOAD_RECEIPT',
        resource: `expense:${expense.id}`,
        metadata: JSON.stringify({ filename, fileType: mimeType, fileSize: file.size }),
      },
    })

    return NextResponse.json({
      success: true,
      expenseId: expense.id,
      fileUrl: `/uploads/${filename}`,
      filePath: filepath,
      mimeType,
    })
  } catch (error) {
    console.error('[Upload]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
