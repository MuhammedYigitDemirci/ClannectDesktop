'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function HomeContent() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Don't do anything on home page if not on app subdomain
    // Let the landing page at clannect.com handle the home route
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    if (!hostname.includes('app.clannect') && hostname !== 'localhost') {
      setLoading(false)
      return
    }

    // Check if user is on a public route (like verify-email or auth verified)
    // These routes should not auto-redirect. Wait until pathname is defined to avoid racing
    if (!pathname) {
      // pathname not ready yet; bail and let effect re-run
      setLoading(false)
      return
    }

    const publicRoutes = ['/verify-email', '/auth/verified', '/login', '/signup', '/auth/admin-verify']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
    
    // CRITICAL: Never auto-redirect away from admin verification pages
    const isAdminpage = pathname.includes('/auth/admin-verify') || pathname.includes('/admin')
    if (isAdminpage) {
      console.log('[HomeContent] ADMIN PAGE detected:', pathname, '- blocking auto-redirect')
      setLoading(false)
      return
    }

    // If on a public route, don't auto-redirect
    if (isPublicRoute) {
      console.log('[HomeContent] Public route detected:', pathname, '- skipping auto-redirect')
      setLoading(false)
      return
    }

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth error:', error)
          setLoading(false)
          return
        }

        if (session) {
          // User is authenticated, redirect to hub
          router.push('/hub')
        } else {
          // User is not authenticated, redirect to signup
          router.push('/signup')
        }
      } catch (err) {
        console.error('Error checking auth:', err)
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase, pathname])

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <p className="text-white">Loading...</p>
    </div>
  )
}
