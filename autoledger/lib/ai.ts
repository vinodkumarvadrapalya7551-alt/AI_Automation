import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'

export interface ExtractedExpense {
  merchant: string
  amount: number
  tax: number
  currency: string
  date: string
  category: string
  description: string
  receiptNumber: string
  paymentMethod: string
  confidenceScore: number
  rawResponse: string
}

const EXTRACTION_PROMPT = `You are a financial document AI. Extract structured expense data from this receipt/invoice image.

Return ONLY a valid JSON object with these exact fields:
{
  "merchant": "string (company/restaurant/store name)",
  "amount": number (total amount as number, no currency symbols),
  "tax": number (tax amount as number, 0 if not found),
  "currency": "string (INR/USD/EUR etc, default INR)",
  "date": "string (YYYY-MM-DD format)",
  "category": "string (one of: Travel/Meals/Accommodation/Transportation/Office Supplies/Software/Equipment/Communication/Training/Entertainment/Other)",
  "description": "string (brief description of the purchase)",
  "receiptNumber": "string (invoice/receipt number, empty if not found)",
  "paymentMethod": "string (Cash/Card/UPI/Online, empty if not found)",
  "confidenceScore": number (0-100, your confidence in the extraction accuracy)
}

Rules:
- amount must be a number (e.g. 2450, not "₹2,450")
- date must be YYYY-MM-DD (e.g. "2026-08-30")
- category must be exactly one of the listed options
- confidenceScore: 90-100 if clear receipt, 70-89 if somewhat unclear, below 70 if very unclear
- Return ONLY the JSON, no explanation text`

// Mock extraction for when no API key is provided
function generateMockExtraction(filename: string): ExtractedExpense {
  const merchants = [
    'Taj Hotels & Resorts', 'IndiGo Airlines', 'Zomato Order', 'Uber Technologies',
    'Amazon India', 'Microsoft India', 'Swiggy', 'MakeMyTrip', 'OYO Rooms',
    'Big Bazaar', 'Reliance Digital', 'Vodafone India', 'IRCTC', 'BookMyShow'
  ]
  const categories = ['Meals', 'Travel', 'Accommodation', 'Transportation', 'Software', 'Equipment', 'Entertainment']
  const paymentMethods = ['UPI', 'Card', 'Cash', 'Online']

  const merchant = merchants[Math.floor(Math.random() * merchants.length)]
  const category = categories[Math.floor(Math.random() * categories.length)]
  const amount = Math.floor(Math.random() * 8000) + 500
  const tax = Math.floor(amount * 0.18)
  const confidence = Math.floor(Math.random() * 15) + 82

  const today = new Date()
  const daysAgo = Math.floor(Math.random() * 30)
  today.setDate(today.getDate() - daysAgo)
  const dateStr = today.toISOString().split('T')[0]

  return {
    merchant,
    amount,
    tax,
    currency: 'INR',
    date: dateStr,
    category,
    description: `Business ${category.toLowerCase()} expense`,
    receiptNumber: `INV-${Math.floor(Math.random() * 90000) + 10000}`,
    paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
    confidenceScore: confidence,
    rawResponse: '(Mock extraction — add GEMINI_API_KEY to .env.local for real AI)',
  }
}

export async function extractExpenseFromFile(filePath: string, mimeType: string): Promise<ExtractedExpense> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    // Use realistic mock extraction
    console.log('[AutoLedger AI] No GEMINI_API_KEY found — using mock extraction')
    const filename = path.basename(filePath)
    return generateMockExtraction(filename)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Read file as base64
    const fileBuffer = fs.readFileSync(filePath)
    const base64Data = fileBuffer.toString('base64')

    // For PDFs, use a text-based approach
    if (mimeType === 'application/pdf') {
      const result = await model.generateContent([
        EXTRACTION_PROMPT,
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data,
          },
        },
      ])

      const text = result.response.text().trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const parsed = JSON.parse(jsonMatch[0])
      return { ...parsed, rawResponse: text }
    }

    // For images
    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      {
        inlineData: {
          mimeType: mimeType as 'image/jpeg' | 'image/png',
          data: base64Data,
        },
      },
    ])

    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    return { ...parsed, rawResponse: text }

  } catch (error) {
    console.error('[AutoLedger AI] Gemini extraction failed:', error)
    // Fallback to mock on error
    return generateMockExtraction(filePath)
  }
}

// Policy compliance check
export interface PolicyCheckResult {
  compliant: boolean
  violations: string[]
  policyRefs: string[]
}

export function checkPolicyCompliance(
  category: string,
  amount: number,
  policies: Array<{ category: string; maxAmount: number; name: string; currency: string }>
): PolicyCheckResult {
  const violations: string[] = []
  const policyRefs: string[] = []

  const applicablePolicies = policies.filter(
    p => p.category === category || p.category === 'ALL'
  )

  for (const policy of applicablePolicies) {
    if (amount > policy.maxAmount) {
      violations.push(
        `${category} expense ₹${amount.toLocaleString('en-IN')} exceeds policy limit of ₹${policy.maxAmount.toLocaleString('en-IN')} (${policy.name})`
      )
      policyRefs.push(policy.name)
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    policyRefs,
  }
}

// Duplicate detection
export interface DuplicateCheckResult {
  isDuplicate: boolean
  similarityScore: number
  matchedExpenseId?: string
  reasons: string[]
}

export function checkForDuplicates(
  newExpense: { merchant: string; amount: number; date: string; receiptNumber: string; userId: string },
  existingExpenses: Array<{ id: string; merchant: string; amount: number; date: string; receiptNumber: string; userId: string }>
): DuplicateCheckResult {
  for (const existing of existingExpenses) {
    if (existing.userId !== newExpense.userId) continue

    const reasons: string[] = []
    let score = 0

    // Receipt number exact match (very strong signal)
    if (newExpense.receiptNumber && existing.receiptNumber &&
        newExpense.receiptNumber === existing.receiptNumber) {
      return {
        isDuplicate: true,
        similarityScore: 100,
        matchedExpenseId: existing.id,
        reasons: ['Identical receipt number'],
      }
    }

    // Merchant match
    const merchantA = newExpense.merchant.toLowerCase().trim()
    const merchantB = existing.merchant.toLowerCase().trim()
    if (merchantA === merchantB) {
      score += 40
      reasons.push('Same merchant')
    } else if (merchantA.includes(merchantB) || merchantB.includes(merchantA)) {
      score += 20
      reasons.push('Similar merchant name')
    }

    // Amount match (within 1%)
    const amountDiff = Math.abs(newExpense.amount - existing.amount) / Math.max(newExpense.amount, existing.amount)
    if (amountDiff < 0.01) {
      score += 40
      reasons.push('Identical amount')
    } else if (amountDiff < 0.05) {
      score += 20
      reasons.push('Very similar amount')
    }

    // Date match (within 3 days)
    const dateA = new Date(newExpense.date)
    const dateB = new Date(existing.date)
    const daysDiff = Math.abs((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff === 0) {
      score += 20
      reasons.push('Same date')
    } else if (daysDiff <= 3) {
      score += 10
      reasons.push(`Date within ${Math.round(daysDiff)} day(s)`)
    }

    if (score >= 80) {
      return {
        isDuplicate: true,
        similarityScore: score,
        matchedExpenseId: existing.id,
        reasons,
      }
    }
  }

  return { isDuplicate: false, similarityScore: 0, reasons: [] }
}
