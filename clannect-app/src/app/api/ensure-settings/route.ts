import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to insert settings for current user (will silently fail if exists)
    const { error: insertError } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        dm_permissions: 'everyone',
        ally_request_permissions: 'everyone',
      })

    // Ignore conflict errors - means settings already exist
    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('Error ensuring user settings:', insertError)
      return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings endpoint error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
