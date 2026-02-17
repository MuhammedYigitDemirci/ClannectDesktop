import { createServiceRoleClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const supabase = createServiceRoleClient()

    // Fetch current profile email to record previous value
    const { data: profileData, error: profileFetchErr } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    const previousEmail = profileData?.email || null

    // Update the auth user's email (admin operation)
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      email: email,
    })

    if (updateErr) {
      console.error('Error updating auth user email:', updateErr)
      return NextResponse.json({ error: updateErr.message || 'Failed to update user email' }, { status: 500 })
    }

    // Update profiles table to keep in sync
    const { error: profileUpdateErr } = await supabase
      .from('profiles')
      .update({ email: email, email_updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (profileUpdateErr) {
      console.error('Error updating profile email:', profileUpdateErr)
      // Continue even if profiles update fails
    }

    // Insert into email_history for audit
    try {
      await supabase.from('email_history').insert({
        user_id: userId,
        previous_email: previousEmail,
        changed_at: new Date().toISOString(),
      })
    } catch (histErr) {
      console.error('Failed to insert email_history:', histErr)
      // Non-fatal
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Restore-email route error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
