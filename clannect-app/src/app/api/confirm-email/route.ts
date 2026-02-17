import { createServiceRoleClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Auto-confirm the email
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (error) {
      console.error('Error confirming email:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Also update the email in the profiles table so it stays in sync
    const { email } = await request.json() as { userId?: string, email?: string }
    if (email) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email })
        .eq('id', userId)

      if (profileError) {
        console.error('Error updating profile email:', profileError)
        // Continue - confirmation succeeded, but profile update failed
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email confirmation error:', err)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
