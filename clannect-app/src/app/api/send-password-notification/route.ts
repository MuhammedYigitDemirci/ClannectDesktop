import { createServiceRoleClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const supabase = createServiceRoleClient()
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || ''

    try {
      // Generate a recovery (password reset) link and let Supabase email it
      const res = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${origin}/auth/password-reset` },
      } as any)

      if ((res as any).error) {
        console.error('Error generating recovery link:', (res as any).error)
        return NextResponse.json({ error: (res as any).error.message || 'Failed to send notification' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch (genErr: any) {
      console.error('generateLink threw:', genErr)
      return NextResponse.json({ error: genErr?.message || 'generateLink failed' }, { status: 500 })
    }
  } catch (err: any) {
    console.error('Send password notification error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
