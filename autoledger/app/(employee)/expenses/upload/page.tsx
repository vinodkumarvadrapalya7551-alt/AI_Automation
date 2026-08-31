'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'

type Stage = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

interface ProcessStep {
  label: string
  status: 'waiting' | 'running' | 'done' | 'error'
  detail?: string
}

export default function UploadPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState('')
  const [expenseId, setExpenseId] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [steps, setSteps] = useState<ProcessStep[]>([
    { label: 'Uploading receipt', status: 'waiting' },
    { label: 'AI document extraction', status: 'waiting' },
    { label: 'Expense categorization', status: 'waiting' },
    { label: 'Duplicate detection', status: 'waiting' },
    { label: 'Policy compliance check', status: 'waiting' },
    { label: 'Automated decision engine', status: 'waiting' },
  ])

  const updateStep = (index: number, status: ProcessStep['status'], detail?: string) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status, detail } : s))
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setFileName(file.name)
    setError('')

    // Preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }

    // Reset steps
    setSteps(s => s.map(st => ({ ...st, status: 'waiting', detail: undefined })))

    // --- Step 1: Upload ---
    setStage('uploading')
    updateStep(0, 'running')

    const formData = new FormData()
    formData.append('file', file)

    const uploadRes = await fetch('/api/receipts/upload', { method: 'POST', body: formData })
    if (!uploadRes.ok) {
      const err = await uploadRes.json()
      setError(err.error || 'Upload failed')
      updateStep(0, 'error', err.error)
      setStage('error')
      return
    }
    const uploadData = await uploadRes.json()
    setExpenseId(uploadData.expenseId)
    updateStep(0, 'done')

    // --- Step 2-6: AI Pipeline ---
    setStage('processing')
    updateStep(1, 'running', 'Analyzing receipt with Gemini Vision...')

    const processRes = await fetch(`/api/receipts/${uploadData.expenseId}/process`, { method: 'POST' })
    if (!processRes.ok) {
      updateStep(1, 'error', 'AI processing failed')
      setStage('error')
      setError('AI processing failed. Please try again.')
      return
    }
    const processData = await processRes.json()

    updateStep(1, 'done', `Merchant: ${processData.extracted?.merchant} • ${processData.extracted?.confidenceScore}% confidence`)
    await delay(400)
    updateStep(2, 'running', 'Assigning expense category...')
    await delay(600)
    updateStep(2, 'done', `Category: ${processData.extracted?.category}`)
    await delay(300)
    updateStep(3, 'running', 'Scanning for duplicates...')
    await delay(500)
    updateStep(3, 'done', processData.duplicateResult?.isDuplicate ? `⚠️ Possible duplicate detected` : '✓ No duplicates found')
    await delay(300)
    updateStep(4, 'running', 'Checking against company policies...')
    await delay(500)
    updateStep(4, 'done', processData.policyResult?.compliant ? '✓ Policy compliant' : `⚠️ ${processData.policyResult?.violations?.length} violation(s)`)
    await delay(300)
    updateStep(5, 'running', 'Running automated decision engine...')
    await delay(600)
    updateStep(5, 'done', `Decision: ${processData.finalStatus}`)

    setStage('done')
    setExpenseId(uploadData.expenseId)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'application/pdf': [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: stage === 'uploading' || stage === 'processing',
  })

  return (
    <div style={{ padding: 32, maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Upload Expense</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Upload a receipt or invoice — AI will extract and process it automatically</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: stage !== 'idle' ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* Upload Zone */}
        <div>
          <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}
            style={{ cursor: stage === 'uploading' || stage === 'processing' ? 'not-allowed' : 'pointer' }}>
            <input {...getInputProps()} />
            {preview ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Receipt preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, marginBottom: 12 }} />
                <div style={{ fontSize: 13, color: '#94a3b8' }}>{fileName}</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 48, marginBottom: 16 }}>
                  {isDragActive ? '⬇️' : '📄'}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                  {isDragActive ? 'Drop it here!' : 'Drag & drop your receipt'}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  or click to browse files
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {['JPG', 'PNG', 'PDF'].map(t => (
                    <span key={t} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>{t}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#334155', marginTop: 12 }}>Max 10MB</div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Processing pipeline */}
        {stage !== 'idle' && (
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🤖</span> AI Processing Pipeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                    background: step.status === 'done' ? 'rgba(16,185,129,0.2)' :
                      step.status === 'running' ? 'rgba(99,102,241,0.2)' :
                        step.status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(71,85,105,0.2)',
                    border: '1px solid',
                    borderColor: step.status === 'done' ? 'rgba(16,185,129,0.4)' :
                      step.status === 'running' ? 'rgba(99,102,241,0.4)' :
                        step.status === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(71,85,105,0.2)',
                    color: step.status === 'done' ? '#10b981' : step.status === 'running' ? '#818cf8' : step.status === 'error' ? '#f87171' : '#475569',
                  }}>
                    {step.status === 'done' ? '✓' : step.status === 'running' ? '⟳' : step.status === 'error' ? '✗' : '○'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: step.status === 'waiting' ? '#475569' : step.status === 'done' ? '#f1f5f9' : '#f1f5f9',
                    }}>
                      {step.label}
                    </div>
                    {step.detail && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{step.detail}</div>
                    )}
                    {step.status === 'running' && (
                      <div className="processing-bar" style={{ marginTop: 6, width: '100%' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {stage === 'done' && (
              <div style={{ marginTop: 24 }}>
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 14, color: '#10b981', fontSize: 13, fontWeight: 600 }}>
                  ✅ Processing complete!
                </div>
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => router.push(`/expenses/${expenseId}`)}>
                  View Expense Details →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }
