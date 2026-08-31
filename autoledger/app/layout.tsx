import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AutoLedger — AI-Powered Expense Automation',
  description: 'Intelligent expense and invoice automation platform. Upload receipts, AI extracts data, automatic policy compliance and approval.',
  keywords: 'expense management, AI, invoice automation, receipt scanning, financial automation',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
