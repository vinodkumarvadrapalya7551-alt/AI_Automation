import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'APPROVED': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    case 'REJECTED': return 'text-red-400 bg-red-400/10 border-red-400/20'
    case 'FLAGGED': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    case 'PROCESSING': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    case 'EXTRACTED': return 'text-violet-400 bg-violet-400/10 border-violet-400/20'
    case 'VALIDATING': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
  }
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Travel': '✈️',
    'Meals': '🍽️',
    'Accommodation': '🏨',
    'Transportation': '🚗',
    'Office Supplies': '📎',
    'Software': '💻',
    'Equipment': '🖥️',
    'Communication': '📞',
    'Training': '📚',
    'Entertainment': '🎭',
    'Other': '📋',
  }
  return icons[category] || '📋'
}

export const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals',
  'Accommodation',
  'Transportation',
  'Office Supplies',
  'Software',
  'Equipment',
  'Communication',
  'Training',
  'Entertainment',
  'Other',
]

export const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'Marketing',
  'Finance',
  'HR',
  'Operations',
  'Design',
  'General',
]
