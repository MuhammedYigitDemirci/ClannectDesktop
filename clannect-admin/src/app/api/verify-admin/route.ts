import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      const devInfo: any = { error: 'Unauthorized' }
      if (process.env.NODE_ENV !== 'production') {
        devInfo.debug = {
          cookieHeader: request.headers.get('cookie'),
          authError: authError?.message || authError || null,
        }
      }

      return NextResponse.json(devInfo, { status: 401 })
    }

    // Check if user is in clannect_admins table
    const { data, error: queryError } = await supabase
      .from('clannect_admins')
      .select('id, role')
      .eq('user_uuid', user.id)
      .single()

    if (queryError || !data) {
      const devInfo: any = { error: 'Not Found' }
      if (process.env.NODE_ENV !== 'production') {
        devInfo.debug = {
          cookieHeader: request.headers.get('cookie'),
          queryError: queryError?.message || queryError || null,
          userId: user?.id || null,
        }
      }

      return NextResponse.json(devInfo, { status: 404 })
    }

    // User is admin
    return NextResponse.json({ admin: true, role: data.role }, { status: 200 })
  } catch (err) {
    console.error('Admin verification error:', err)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
