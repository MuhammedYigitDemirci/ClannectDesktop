import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from './supabase'

export type AdminRole = 'super_admin' | 'moderator'

export interface AdminUser {
  id: string
  user_uuid: string
  role: AdminRole
  created_at: string
}

/**
 * Check if a user is an admin by querying the clannect_admins table.
 * Uses server-side Supabase client with service role key.
 * Returns the admin record if found, null otherwise.
 * Can be called from middleware or server components without CORS issues.
 */
export const verifyAdminFromSession = async (): Promise<AdminUser | null> => {
  try {
    // Create server client (uses service role key on server-side)
    const supabase = await createClient()

    // Get current user from session (reads cookies)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      return null
    }

    // Query clannect_admins with user UUID
    const { data, error } = await supabase
      .from('clannect_admins')
      .select('id, user_uuid, role, created_at')
      .eq('user_uuid', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found (not an admin)
        return null
      }
      console.error('Admin check error:', error)
      return null
    }

    return data as AdminUser
  } catch (err) {
    console.error('Unexpected error verifying admin:', err)
    return null
  }
}
