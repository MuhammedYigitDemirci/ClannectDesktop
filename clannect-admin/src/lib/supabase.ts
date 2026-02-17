import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create a Supabase server client using the service role key when available.
// Using the service role key on the server allows us to perform admin checks
// (and read session cookies) reliably without client-side limitations.
export const createClient = async () => {
  const cookieStore = await cookies()

  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore cookie setting errors in server components
          }
        },
      },
    }
  )
}
