'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function VerifiedPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState<number>(3)

  useEffect(() => {
    const handleVerification = async () => {
      try {
        if (typeof window === 'undefined') return

        // Extract code from URL
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (!code) {
          console.error('[Verified] No code in URL')
          setStatus('error')
          setMessage('Invalid verification link.')
          return
        }

        console.log('[Verified] Found code, exchanging on server...')

        // Step 1: Call server to exchange code for session
        // The server-side SSR client handles PKCE properly and sets session cookies
        try {
          const response = await fetch('/api/verify-email-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          })

          const result = await response.json()

          if (!response.ok) {
            console.error('[Verified] Server code exchange failed:', result.error)
            setStatus('error')
            setMessage(result.error || 'Failed to verify email.')
            return
          }

          console.log('[Verified] ✅ Code exchanged on server, session cookie set')
        } catch (err) {
          console.error('[Verified] Server request failed:', err)
          setStatus('error')
          setMessage('An error occurred during verification.')
          return
        }

        // Step 2: Wait a moment for cookies to be processed
        await new Promise(resolve => setTimeout(resolve, 500))

        // Step 3: Now check if user is authenticated
        // The browser client should now have the session from cookies set by the server
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          console.error('[Verified] getUser error after code exchange:', error.message)
          setStatus('error')
          setMessage('Failed to verify your email.')
          return
        }

        if (!user) {
          console.warn('[Verified] No user found after code exchange')
          setStatus('error')
          setMessage('Verification failed.')
          return
        }

        if (user.email_confirmed_at) {
          console.log('[Verified] ✅ Email verified for user:', user.email)
          setStatus('success')
        } else {
          console.warn('[Verified] User email not confirmed:', user.email)
          setStatus('error')
          setMessage('Email verification failed.')
        }
      } catch (err) {
        console.error('[Verified] Unexpected error:', err)
        setStatus('error')
        setMessage('An unexpected error occurred.')
      }
    }

    handleVerification()
  }, [])

  // Start countdown and redirect when verification succeeded
  useEffect(() => {
    if (status !== 'success') return

    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          router.push('/hub')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [status, router])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#1f1f1f] rounded-xl border border-gray-800 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4234]"></div>
        </div>
        <p className="text-gray-300">Verifying your email...</p>
      </div>
    </div>
  )

  if (status === 'success') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#1f1f1f] rounded-xl border border-gray-800 p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Email Verified</h1>
        <p className="text-gray-300 mb-4">Your email address has been confirmed successfully.</p>
        <p className="text-gray-400">Redirecting to your Hub in {countdown} second{countdown === 1 ? '' : 's'}...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#1f1f1f] rounded-xl border border-gray-800 p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Verification failed</h1>
        <p className="text-gray-300 mb-6">{message || 'Invalid or expired link'}</p>
        <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
          <p className="text-gray-400 text-sm mb-3">
            <strong>Try these steps:</strong>
          </p>
          <ul className="text-gray-400 text-sm space-y-2">
            <li>• <button onClick={() => window.location.reload()} className="text-[#ff4234] hover:underline">Refresh this page</button></li>
            <li>• Check your email for the verification link from Clannect</li>
            <li>• Links expire after 24 hours - request a new one if needed</li>
          </ul>
        </div>
        <button
          onClick={() => router.push('/signup')}
          className="w-full bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200"
        >
          Back to Signup
        </button>
      </div>
    </div>
  )
}
