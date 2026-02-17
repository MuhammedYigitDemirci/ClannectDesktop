'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import HubPage from '../page'

// This route catches /hub/[anything] and redirects to /hub/post/[postId]
export default function HubCatchAllPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params?.postId as string

  useEffect(() => {
    // If postId looks like a valid post ID, redirect to /hub/post/[postId]
    if (postId && postId !== 'post') {
      router.replace(`/hub/post/${postId}`)
      return
    }
    
    // If it's something else, just show the hub page
    // (it will auto-redirect to first post)
  }, [postId, router])

  // Show the main hub page
  return <HubPage />
}
