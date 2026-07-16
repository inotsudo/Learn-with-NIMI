'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type State = 'loading' | 'success' | 'already' | 'error'

function UnsubscribeContent() {
  const params = useSearchParams()
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setState('error'); return }

    void fetch(`/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then((json: { ok?: boolean; already?: boolean; error?: string }) => {
        if (json.ok && json.already) setState('already')
        else if (json.ok)            setState('success')
        else                         setState('error')
      })
      .catch(() => setState('error'))
  }, [params])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-sm w-full p-8 text-center">
        {state === 'loading' && (
          <>
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Processing your request…</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">You&apos;re unsubscribed</h1>
            <p className="text-gray-500 text-sm mb-6">
              You&apos;ve been removed from the NIMIPIKO newsletter. You won&apos;t receive any more emails from us.
            </p>
            <Link href="/" className="text-green-600 text-sm font-semibold hover:underline">
              Back to NIMIPIKO →
            </Link>
          </>
        )}

        {state === 'already' && (
          <>
            <div className="text-4xl mb-4">👋</div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">Already unsubscribed</h1>
            <p className="text-gray-500 text-sm mb-6">
              This email address has already been removed from our newsletter.
            </p>
            <Link href="/" className="text-green-600 text-sm font-semibold hover:underline">
              Back to NIMIPIKO →
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">Link not found</h1>
            <p className="text-gray-500 text-sm mb-6">
              This unsubscribe link is invalid or has expired. If you&apos;d like to be removed, please
              reply to any of our emails and we&apos;ll remove you manually.
            </p>
            <Link href="/" className="text-green-600 text-sm font-semibold hover:underline">
              Back to NIMIPIKO →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
