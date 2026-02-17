import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { nanoid } from 'nanoid'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = body?.email

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    const service = createServiceRoleClient()

    // Verify user exists
    const { data: users, error: listErr } = await service.auth.admin.listUsers()
    const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      // Return generic message for privacy (don't reveal if email exists)
      return NextResponse.json({ success: true })
    }

    // Generate a 32-character reset code
    const code = nanoid(32)
    
    // Expiry: 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    // Store reset token in DB
    const { error: storeErr } = await service
      .from('reset_tokens')
      .insert({
        email: user.email,
        code,
        expires_at: expiresAt,
      })

    if (storeErr) {
      console.error('[generate-reset-token] error storing reset token:', storeErr)
      return NextResponse.json({ error: 'Failed to create reset token' }, { status: 500 })
    }

    // Build reset URL
    const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://app.clannect.com'
    const resetUrl = `${appOrigin}/auth/password-reset?code=${code}`

    // Note: Email sending should be handled via Supabase's built-in resetPasswordForEmail
    // or a separate email service. This endpoint stores the code and returns the reset URL.
    console.info('[generate-reset-token] reset code created for:', user.email)

    return NextResponse.json({ success: true, resetUrl })
  } catch (err) {
    console.error('[generate-reset-token] server error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
