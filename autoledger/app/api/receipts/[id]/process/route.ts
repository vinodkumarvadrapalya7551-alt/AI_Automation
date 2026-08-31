import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { extractExpenseFromFile, checkPolicyCompliance, checkForDuplicates } from '@/lib/ai'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch expense + receipt
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { receipt: true },
    })

    if (!expense || expense.userId !== session.userId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    if (!expense.receipt) {
      return NextResponse.json({ error: 'No receipt found' }, { status: 400 })
    }

    // Update status to PROCESSING
    await prisma.expense.update({ where: { id }, data: { status: 'PROCESSING' } })

    // Get file path
    const filePath = path.join(process.cwd(), 'public', expense.receipt.fileUrl.replace('/uploads/', 'uploads/'))

    // Run AI extraction
    const extracted = await extractExpenseFromFile(filePath, expense.receipt.fileType)

    // Update to EXTRACTED
    await prisma.expense.update({ where: { id }, data: { status: 'EXTRACTED' } })

    // Update to VALIDATING
    await prisma.expense.update({ where: { id }, data: { status: 'VALIDATING' } })

    // Load active policies
    const policies = await prisma.policy.findMany({ where: { isActive: true } })

    // Policy compliance check
    const policyResult = checkPolicyCompliance(
      extracted.category,
      extracted.amount,
      policies.map(p => ({ category: p.category, maxAmount: p.maxAmount, name: p.name, currency: p.currency }))
    )

    // Duplicate detection — load user's recent expenses
    const recentExpenses = await prisma.expense.findMany({
      where: {
        userId: session.userId,
        id: { not: id },
        status: { notIn: ['REJECTED'] },
      },
      select: { id: true, merchant: true, amount: true, date: true, receiptNumber: true, userId: true },
      take: 50,
    })

    const duplicateResult = checkForDuplicates(
      {
        merchant: extracted.merchant,
        amount: extracted.amount,
        date: extracted.date,
        receiptNumber: extracted.receiptNumber,
        userId: session.userId,
      },
      recentExpenses
    )

    // Build flag reasons
    const flagReasons: string[] = []
    if (!policyResult.compliant) flagReasons.push(...policyResult.violations)
    if (duplicateResult.isDuplicate) {
      flagReasons.push(`Possible duplicate detected (${duplicateResult.similarityScore}% similarity)`)
    }

    // Determine final status
    let finalStatus = 'APPROVED'
    if (duplicateResult.isDuplicate || !policyResult.compliant) {
      finalStatus = 'FLAGGED'
    }
    if (extracted.confidenceScore < 70) {
      finalStatus = 'FLAGGED'
      flagReasons.push(`Low extraction confidence: ${extracted.confidenceScore}%`)
    }

    // Build AI reasoning string
    const aiReasoning = [
      `Extraction confidence: ${extracted.confidenceScore}%`,
      policyResult.compliant ? '✓ Policy compliant' : `✗ Policy violations: ${policyResult.violations.join('; ')}`,
      duplicateResult.isDuplicate
        ? `✗ Duplicate detected: ${duplicateResult.reasons.join(', ')}`
        : '✓ No duplicates found',
    ].join('\n')

    // Save extracted data
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        merchant: extracted.merchant,
        amount: extracted.amount,
        tax: extracted.tax,
        currency: extracted.currency,
        date: extracted.date,
        category: extracted.category,
        description: extracted.description,
        receiptNumber: extracted.receiptNumber,
        paymentMethod: extracted.paymentMethod,
        confidenceScore: extracted.confidenceScore,
        aiReasoning,
        duplicateFlag: duplicateResult.isDuplicate,
        policyFlag: !policyResult.compliant,
        flagReasons: JSON.stringify(flagReasons),
        status: finalStatus,
      },
      include: { receipt: true },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'AI_PROCESS_EXPENSE',
        resource: `expense:${id}`,
        metadata: JSON.stringify({ status: finalStatus, flagReasons }),
      },
    })

    return NextResponse.json({
      success: true,
      expense: updated,
      extracted,
      policyResult,
      duplicateResult,
      flagReasons,
      finalStatus,
    })
  } catch (error) {
    console.error('[Process]', error)
    // Mark as needing review on error
    const { id } = await params
    await prisma.expense.update({
      where: { id },
      data: { status: 'FLAGGED', aiReasoning: 'Processing error — requires manual review' },
    }).catch(() => {})
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
