import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 })
    }

    // Build a minimal cookieStore wrapper for createServerSideClient
    const cookieStore = {
      getAll() {
        try {
          return request.cookies.getAll().map((c: any) => ({ name: c.name, value: c.value }))
        } catch {
          return []
        }
      },
      setAll(_: any[]) {
        // No-op in route handler
      }
    }

    const supabase = createServerSideClient(cookieStore)

    // Ensure there's a valid session and extract the user's email
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr || !sessionData?.session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const email = sessionData.session.user.email
    if (!email) {
      return NextResponse.json({ error: 'No email on session' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      console.error('Missing Supabase URL or anon key')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const tokenUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ email, password }),
    })

    const json = await res.json().catch(() => ({}))

    if (res.ok && json?.access_token) {
      return NextResponse.json({ success: true })
    }

    const msg = json?.error_description || json?.error || 'Invalid credentials'
    return NextResponse.json({ error: msg }, { status: 401 })
  } catch (err: any) {
    console.error('verify-password error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
