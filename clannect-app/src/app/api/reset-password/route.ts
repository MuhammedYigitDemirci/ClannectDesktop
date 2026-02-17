import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { createClient as createAnonClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const code = body?.code
    const password = body?.password
    const isSupabaseToken = body?.isSupabaseToken

    if (!code || !password) {
      return NextResponse.json({ error: 'Missing code or password' }, { status: 400 })
    }

    const service = createServiceRoleClient()

    if (isSupabaseToken) {
      // Handle Supabase recovery token
      try {
        const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
        const { data: userData, error: getErr } = await anon.auth.getUser(code)

        if (getErr || !userData?.user) {
          console.warn('[reset-password] token validation failed:', getErr)
          return NextResponse.json({ error: 'Invalid or expired password reset link' }, { status: 400 })
        }

        const userId = userData.user.id
        const { data, error } = await service.auth.admin.updateUserById(userId, { password })

        if (error) {
          console.error('[reset-password] password update failed:', error)
          return NextResponse.json({ error: error.message || 'Failed to update password' }, { status: 400 })
        }

        return NextResponse.json({ success: true })
      } catch (e) {
        console.error('[reset-password] token handling error:', e)
        return NextResponse.json({ error: 'Invalid or expired password reset link' }, { status: 400 })
      }
    } else {
      // Handle DB-backed reset code
      const { data: resetTokens, error: queryErr } = await service
        .from('reset_tokens')
        .select('id, email, used_at, expires_at')
        .eq('code', code)
        .maybeSingle()

      if (queryErr) {
        console.error('[reset-password] DB query error:', queryErr)
        return NextResponse.json({ error: 'Failed to validate reset code' }, { status: 500 })
      }

      if (!resetTokens) {
        console.warn('[reset-password] reset code not found')
        return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 })
      }

      if (resetTokens.used_at) {
        console.warn('[reset-password] code already used')
        return NextResponse.json({ error: 'This reset code has already been used' }, { status: 400 })
      }

      const now = new Date()
      const expiresAt = new Date(resetTokens.expires_at)
      if (now > expiresAt) {
        console.warn('[reset-password] code expired')
        return NextResponse.json({ error: 'Reset code has expired. Please request a new one.' }, { status: 400 })
      }

      const email = resetTokens.email

      const { data: users, error: userErr } = await service.auth.admin.listUsers()
      const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

      if (!user) {
        console.warn('[reset-password] user not found:', email)
        return NextResponse.json({ error: 'User not found' }, { status: 400 })
      }

      const { data, error } = await service.auth.admin.updateUserById(user.id, { password })

      if (error) {
        console.error('[reset-password] password update failed:', error)
        return NextResponse.json({ error: error.message || 'Failed to update password' }, { status: 400 })
      }

      const { error: markErr } = await service
        .from('reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', resetTokens.id)

      if (markErr) {
        console.warn('[reset-password] failed to mark code as used:', markErr)
      }

      return NextResponse.json({ success: true })
    }
  } catch (err) {
    console.error('[reset-password] server error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
