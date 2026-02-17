import { createServiceRoleClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Trigger signup verification email
 * Resends the signup confirmation email with the verification link
 */
export async function POST(request: NextRequest) {
  try {
    const { email, redirectUrl } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[trigger-signup-email] Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const supabase = createServiceRoleClient()
    const finalRedirectUrl = redirectUrl || `${process.env.NEXT_PUBLIC_APP_ORIGIN || ''}/auth/verified`

    console.log('[trigger-signup-email] Attempting to resend signup email:', email)

    // Use auth.resend to send the signup confirmation email
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: finalRedirectUrl },
      })

      if (error) {
        console.error('[trigger-signup-email] Resend error:', error)
        return NextResponse.json({ error: error.message || 'Failed to send verification email' }, { status: 500 })
      }

      console.log('[trigger-signup-email] ✅ Verification email sent for:', email)
      return NextResponse.json({ success: true, message: 'Verification email sent' })
    } catch (err) {
      console.error('[trigger-signup-email] Unexpected error:', err)
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
    }
  } catch (err) {
    console.error('[trigger-signup-email] Request parsing error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
