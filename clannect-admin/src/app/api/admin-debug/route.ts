import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Dev-only debug endpoint to inspect session + admin lookup.
// DO NOT enable in production.
export async function GET(request: NextRequest) {
  // In production this endpoint is disabled by default. Allow it only when
  // a valid secret is provided via the `x-admin-debug-secret` header.
  const providedSecret = request.headers.get('x-admin-debug-secret') || null
  if (process.env.NODE_ENV === 'production') {
    if (!providedSecret || providedSecret !== process.env.ADMIN_DEBUG_SECRET) {
      return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
    }
  }

  try {
    const supabase = await createClient()

    const cookieHeader = request.headers.get('cookie') || null

    const { data: userData, error: userErr } = await supabase.auth.getUser()

    let adminRow = null
    let adminErr = null
    if (userData?.user?.id) {
      const res = await supabase
        .from('clannect_admins')
        .select('id, user_uuid, role, created_at')
        .eq('user_uuid', userData.user.id)
        .single()
      adminRow = res.data || null
      adminErr = res.error || null
    }

    return NextResponse.json({
      cookieHeader,
      user: userData?.user || null,
      userError: userErr || null,
      adminRow,
      adminError: adminErr || null,
    })
  } catch (err) {
    console.error('admin-debug error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
