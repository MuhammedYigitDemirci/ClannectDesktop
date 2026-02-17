"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PasswordResetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tokenFromHash, setTokenFromHash] = useState<string | null>(null)

  useEffect(() => {
    // If code param is present, use it directly
    if (code) return

    // Otherwise, try to extract token from URL hash (Supabase recovery links)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.replace('#', ''))
        const token = params.get('access_token')
        if (token) {
          setTokenFromHash(token)
        }
      }
    }
  }, [])

  const valid = newPassword.length >= 8 && newPassword === confirmPassword

  const handleSave = async () => {
    setError(null)
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Determine which identifier to use: code or token
      const identifier = code || tokenFromHash
      if (!identifier) {
        setError('Reset link missing or invalid. Please request a new password reset email.')
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: identifier,
            isSupabaseToken: !!tokenFromHash && !code,
            password: newPassword,
          }),
        })

        const j = await res.json()
        if (!res.ok) {
          setError(j?.error || 'Failed to reset password')
          setLoading(false)
          return
        }

        // Success
        router.push('/hub')
      } catch (err) {
        setError('Failed to reset password')
        setLoading(false)
      }
    } catch (err) {
      setError('Failed to reset password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-[#151515] to-[#0f0f0f] border border-gray-700 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Set a new password</h1>
        <p className="text-sm text-gray-300 mb-4">Enter a new password for your account{code || tokenFromHash ? '' : ' — reset link missing or invalid'}</p>

        {error && <div className="mb-4 text-red-300 font-semibold">{error}</div>}

        <label className="block text-xs text-gray-300 font-semibold mb-1">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value.slice(0, 128))}
          className="w-full mb-3 px-4 py-3 bg-[#1b1b1b] border border-gray-600 rounded-lg text-white outline-none"
          placeholder="New Password"
        />

        <label className="block text-xs text-gray-300 font-semibold mb-1">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value.slice(0, 128))}
          className="w-full mb-4 px-4 py-3 bg-[#1b1b1b] border border-gray-600 rounded-lg text-white outline-none"
          placeholder="Confirm New Password"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid || loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff4234] to-[#ff6b5b] text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
