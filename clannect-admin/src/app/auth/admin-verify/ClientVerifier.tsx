"use client"

import { useEffect, useState } from 'react'

type Props = { token?: string | null }

export default function ClientVerifier({ token }: Props) {
  const [loading, setLoading] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clientToken, setClientToken] = useState<string | null>(token || null)
  const [profile, setProfile] = useState<any | null>(null)

  useEffect(() => {
    // If no token prop provided from server, fall back to reading from URL on client
    if (!clientToken) {
      try {
        const u = new URL(window.location.href)
        const t = u.searchParams.get('t')
        if (t) setClientToken(t)
      } catch (e) {
        // ignore
      }
    }

    if (!clientToken) return
    let cancelled = false
    const verify = async () => {
      setLoading(true)
      console.log('[ClientVerifier] verifying token', clientToken?.slice(0, 8) + '...')
      try {
        const res = await fetch('/api/verify-admin-token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: clientToken })
        })
        const data = await res.json()
        console.log('[ClientVerifier] verify response', { status: res.status, data })
        if (cancelled) return
        if (res.ok && data?.success) {
            setAdminId(data.admin_id)
        } else {
          setError(data?.error || 'verification_failed')
        }
      } catch (err: any) {
        console.error('[ClientVerifier] verify network error', err)
        setError(err?.message || 'network_error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    verify()
    return () => { cancelled = true }
  }, [clientToken])

  // When adminId is available, fetch profile from server API (avoids CORS/REST issues)
  useEffect(() => {
    if (!adminId) return
    let cancelled = false
    const load = async () => {
      try {
        console.log('[ClientVerifier] fetching profile for', adminId)
        const res = await fetch('/api/get-admin-profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ admin_id: adminId })
        })
        const data = await res.json()
        console.log('[ClientVerifier] profile response', { status: res.status, data })
        if (cancelled) return
            if (res.ok && data?.success) {
              setProfile(data.profile || null)
        } else {
          console.warn('[ClientVerifier] failed to load profile', data)
        }
      } catch (err) {
        console.error('[ClientVerifier] profile fetch error', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [adminId])

  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-[#1f1f1f] p-8 rounded-lg shadow-lg max-w-xl text-center">
        {loading && <p className="text-gray-300">Verifying token...</p>}
        {!loading && !clientToken && (
          <>
            <h2 className="text-xl font-semibold">No token provided</h2>
            <p className="mt-2 text-gray-300">Please navigate here from the main app admin button.</p>
          </>
        )}

        {!loading && adminId && (
          <>
            <h1 className="text-2xl font-semibold text-[#ff4234]">Admin Verified</h1>
            <p className="mt-4 text-gray-200">Admin user ID: <span className="font-mono">{adminId}</span></p>
            {profile && (
              <p className="mt-2 text-gray-200">Username: <span className="font-mono">{profile.username || profile.display_name || ''}</span></p>
            )}
            <script dangerouslySetInnerHTML={{ __html: `(() => {
              try {
                const u = new URL(window.location.href);
                u.searchParams.delete('t');
                window.history.replaceState({}, '', u.toString());
              } catch (e) { /* ignore */ }
            })()` }} />
          </>
        )}
        {!loading && error && (
          <>
            <h1 className="text-2xl font-semibold text-red-500">Verification Failed</h1>
            <p className="mt-4 text-gray-300">{error}</p>
          </>
        )}
      </div>
    </div>
  )
}
