import { cookies } from 'next/headers'
import { createServerSideClient } from '@/lib/supabase'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

function base64urlEncode(obj: any) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj)
  return Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerSideClient(cookieStore)
    console.log('[create-admin-token] cookieStore keys:', Object.keys(cookieStore || {}))

    // Get current user from session
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user?.id) return new Response(JSON.stringify({ success: false, error: 'not_authenticated' }), { status: 401 })

    // Verify admin status using service role client
    const svc = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data: adminRec, error: adminErr } = await svc
      .from('clannect_admins')
      .select('user_uuid')
      .eq('user_uuid', user.id)
      .maybeSingle()

    if (adminErr) {
      console.error('[create-admin-token] admin lookup error', adminErr)
      // Return the error message for debugging (remove in production)
      return new Response(JSON.stringify({ success: false, error: 'db_error', details: adminErr.message || String(adminErr) }), { status: 500 })
    }

    if (!adminRec) {
      return new Response(JSON.stringify({ success: false, error: 'not_admin' }), { status: 403 })
    }

    // Create simple JWT (HS256)
    const header = { alg: 'HS256', typ: 'JWT' }
    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + 60 * 5 // 5 minutes
    const payload = { sub: user.id, iat, exp }

    const signingInput = `${base64urlEncode(header)}.${base64urlEncode(payload)}`

    const secret = process.env.ADMIN_SHARED_SECRET || process.env.NEXT_PUBLIC_ADMIN_SHARED_SECRET || ''
    if (!secret) {
      console.error('[create-admin-token] missing ADMIN_SHARED_SECRET')
      return new Response(JSON.stringify({ success: false, error: 'server_misconfigured' }), { status: 500 })
    }

    const signature = createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const token = `${signingInput}.${signature}`

    return new Response(JSON.stringify({ success: true, token }), { status: 200 })
  } catch (err) {
    console.error('[create-admin-token] Exception:', err)
    return new Response(JSON.stringify({ success: false, error: 'exception' }), { status: 500 })
  }
}
