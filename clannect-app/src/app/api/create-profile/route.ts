import { createServiceRoleClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { id, username, email, banner_gradient } = await request.json()

    if (!id || !username || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS
    const supabase = createServiceRoleClient()

    // Try to create/update the profile (ignore duplicate errors)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: id,
        username: username,
        email: email,
        banner_gradient: banner_gradient || 'from-blue-600 to-purple-600',
        created_at: new Date().toISOString(),
      })

    // If duplicate error, that's OK - the trigger already created it
    if (profileError && !profileError.message.includes('duplicate')) {
      console.error('Error creating profile:', profileError)
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Auto-confirm the email so user can log in immediately
    const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
      email_confirm: true,
    })

    if (updateError) {
      console.error('Error confirming email:', updateError)
      // Don't fail - profile exists, just couldn't confirm email
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Profile creation endpoint error:', err)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
