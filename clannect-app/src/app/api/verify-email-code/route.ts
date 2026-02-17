import { createServerSideClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side email verification handler
 * Exchanges the verification code for a session using the SSR client
 * The SSR client properly manages PKCE verifiers via secure cookies
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }

    console.log('[verify-email-code] Processing verification code:', code.substring(0, 8) + '...')

    const cookieStore = await cookies()
    const supabase = createServerSideClient(cookieStore)

    try {
      // Here's the critical part: use the server-side SSR client to exchange the code
      // The SSR client from @supabase/ssr PROPERLY handles PKCE verification
      // It stores the PKCE verifier in cookies and can retrieve it server-side
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[verify-email-code] Code exchange error:', error.message)
        return NextResponse.json(
          { error: error.message || 'Failed to exchange verification code' },
          { status: 400 }
        )
      }

      if (!data?.user) {
        console.error('[verify-email-code] No user returned after code exchange')
        return NextResponse.json(
          { error: 'Verification failed: no user' },
          { status: 400 }
        )
      }

      console.log('[verify-email-code] ✅ Code verified for user:', data.user.email)
      console.log('[verify-email-code] Email confirmed at:', data.user.email_confirmed_at)

      return NextResponse.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
        },
      })
    } catch (err: any) {
      console.error('[verify-email-code] exchangeCodeForSession threw:', err.message || err)
      return NextResponse.json(
        { error: err?.message || 'Code exchange failed' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('[verify-email-code] Request error:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
