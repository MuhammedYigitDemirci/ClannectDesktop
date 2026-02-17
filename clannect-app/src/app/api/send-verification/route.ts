/**
 * send-verification route
 * -----------------------
 * Purpose: server-side route that generates and sends a Supabase email
 * verification link (or magic link fallback) for a given email.
 *
 * SECURITY NOTICE:
 * - This route uses the Supabase Service Role key via the server-side
 *   `createServiceRoleClient()` helper. The service role key bypasses
 *   Row-Level Security and has full privileges. Do NOT expose this key
 *   to the browser or commit it to source control.
 * - Rotate your service role key immediately if it has been shared.
 * - For production, restrict this route to authenticated users and only
 *   send to the signed-in user's email. Rate-limit calls to prevent abuse.
 */
import { createServiceRoleClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Debug: show which environment variables are visible at runtime (do NOT log secret values)
    try {
      console.log('[send-verification] runtime debug:', {
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd(),
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        appOrigin: process.env.NEXT_PUBLIC_APP_ORIGIN || null,
      })
    } catch (dbgErr) {
      console.error('[send-verification] debug logging failed:', dbgErr)
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    // Ensure service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server misconfiguration: missing service role key' }, { status: 500 })
    }

    const supabase = createServiceRoleClient()

    // Generate a signup/verification link and let Supabase send it via the configured email provider
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || ''
    const redirectTo = `${origin}/auth/verified`

    try {
      const res = await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        options: { redirectTo },
      } as any)

      // Supabase v1 admin methods return { data, error }
      // Return any error message to the client to help with debugging
      if ((res as any).error) {
        const err = (res as any).error
        console.error('Error generating verification link:', err)
        const msg = err?.message || String(err)

        // If the user already exists, first try resending the original signup
        // confirmation email (same behavior as `signUp`), then fall back to a
        // magic link if resend isn't applicable.
        if (/already been registered/i.test(msg) || /already exists/i.test(msg)) {
          try {
            // Attempt to resend the signup confirmation email (resend will
            // only send if there was an initial signup/confirmation pending)
            const resend = await supabase.auth.resend({
              type: 'signup',
              email,
              options: { emailRedirectTo: redirectTo },
            } as any)

            if ((resend as any)?.error) {
              // If resend failed (for example, no pending signup), fall back
              // to generating a magic link so the user can sign in.
              console.warn('Resend signup confirmation failed, falling back to magiclink:', (resend as any).error)
            } else {
              const action = (resend as any)?.data?.action_link || (resend as any)?.data?.link || null
              return NextResponse.json({ success: true, action_link: action, data: (resend as any).data, method: 'resend' })
            }

            // Fallback: generate a magic link so the user can authenticate
            const fallback = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email,
              options: { redirectTo },
            } as any)

            if ((fallback as any).error) {
              console.error('Fallback magiclink error:', (fallback as any).error)
              return NextResponse.json({ error: (fallback as any).error.message || (fallback as any).error }, { status: 500 })
            }

            const fbAction = (fallback as any)?.data?.action_link || (fallback as any)?.data?.link || null
            return NextResponse.json({ success: true, action_link: fbAction, data: (fallback as any).data, fallback: 'magiclink' })
          } catch (fbErr: any) {
            console.error('Fallback generateLink threw:', fbErr)
            return NextResponse.json({ error: fbErr?.message || 'Fallback generateLink failed' }, { status: 500 })
          }
        }

        return NextResponse.json({ error: msg }, { status: 500 })
      }

      const actionLink = (res as any)?.data?.action_link || (res as any)?.data?.link || null
      return NextResponse.json({ success: true, action_link: actionLink, data: (res as any).data })
    } catch (genErr: any) {
      console.error('generateLink threw:', genErr)
      return NextResponse.json({ error: genErr?.message || 'generateLink failed' }, { status: 500 })
    }
  } catch (err) {
    console.error('Send verification error:', err)
    return NextResponse.json({ error: (err as any)?.message || 'Server error' }, { status: 500 })
  }
}
