'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    // If on bare /hub, redirect to first real post
    if (pathname === '/hub' || pathname === '/hub/') {
      const fetchAndRedirect = async () => {
        try {
          const { data: posts, error } = await supabase
            .from('posts')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
          
          if (error || !posts || posts.length === 0) {
            // Fallback to /hub/post/1 if no posts found
            router.push('/hub/post/1')
            return
          }
          
          const postId = posts[0].id
          router.push(`/hub/post/${postId}`)
        } catch (err) {
          console.error('Failed to fetch first post:', err)
          router.push('/hub/post/1')
        }
      }
      
      fetchAndRedirect()
    }
  }, [pathname, router, supabase])

  // If on bare /hub, show nothing while redirecting
  if (pathname === '/hub' || pathname === '/hub/') {
    return null
  }

  // Otherwise show the actual content
  return children
}
