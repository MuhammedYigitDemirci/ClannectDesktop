import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const admin_id = body?.admin_id
    if (!admin_id) return NextResponse.json({ error: 'missing_admin_id' }, { status: 400 })

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, equipped_frame')
      .eq('id', admin_id)
      .maybeSingle()

    if (error) {
      console.error('[get-admin-profile] supabase error', error)
      return NextResponse.json({ error: 'db_error', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: data }, { status: 200 })
  } catch (err: any) {
    console.error('[get-admin-profile] Exception', err)
    return NextResponse.json({ error: 'exception', details: String(err) }, { status: 500 })
  }
}
