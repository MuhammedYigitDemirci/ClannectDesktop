'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GlobalLoading from '../../components/GlobalLoading'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Post {
  id: string
  user_id: string
  content: string
  media_url: string | null
  created_at: string
  profiles?: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
}

export default function PostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.postId as string
  const supabase = createClient()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allPostIds, setAllPostIds] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        
        // Fetch the specific post
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (postError || !postData) {
          setError('Post not found')
          setLoading(false)
          return
        }

        // Fetch author profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', postData.user_id)
          .single()

        const enrichedPost = {
          ...postData,
          profiles: profileData
        }

        setPost(enrichedPost)

        // Fetch all post IDs for navigation
        const { data: allPosts } = await supabase
          .from('posts')
          .select('id')
          .order('created_at', { ascending: false })

        if (allPosts) {
          const ids = allPosts.map(p => p.id)
          setAllPostIds(ids)
          const index = ids.findIndex(id => id === postId)
          setCurrentIndex(index >= 0 ? index : 0)
        }

        setLoading(false)
      } catch (err) {
        console.error('Error fetching post:', err)
        setError('Failed to load post')
        setLoading(false)
      }
    }

    if (postId) {
      fetchPost()
    }
  }, [postId, supabase])

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevPostId = allPostIds[currentIndex - 1]
      router.push(`/post/${prevPostId}`)
    }
  }

  const handleNext = () => {
    if (currentIndex < allPostIds.length - 1) {
      const nextPostId = allPostIds[currentIndex + 1]
      router.push(`/post/${nextPostId}`)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      handlePrevious()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleNext()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, allPostIds])

  if (loading) {
    return <GlobalLoading />
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">{error || 'Post not found'}</p>
          <button
            onClick={() => router.push('/hub')}
            className="bg-[#ff4234] hover:bg-red-600 text-white px-6 py-2 rounded-lg"
          >
            Back to Feed
          </button>
        </div>
      </div>
    )
  }

  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < allPostIds.length - 1

  return (
    <div className="min-h-screen bg-[#181818] text-white flex items-center justify-center p-4">
      {/* Main Post Container */}
      <div className="w-full max-w-2xl relative">
        {/* Post Content */}
        <div className="bg-[#1f1f1f] rounded-lg overflow-hidden">
          {/* Post Author */}
          <div className="p-4 border-b border-gray-800 flex items-center gap-3">
            {post.profiles?.avatar_url ? (
              <img
                src={post.profiles.avatar_url}
                alt={post.profiles.username}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center">
                <span className="text-sm font-bold">?</span>
              </div>
            )}
            <div>
              <p className="text-white font-semibold">{post.profiles?.display_name || post.profiles?.username}</p>
              <p className="text-gray-400 text-sm">@{post.profiles?.username}</p>
            </div>
          </div>

          {/* Post Media */}
          {post.media_url && (
            <div className="w-full bg-black flex items-center justify-center max-h-96">
              <img
                src={post.media_url}
                alt="Post media"
                className="w-full h-auto object-contain max-h-96"
              />
            </div>
          )}

          {/* Post Content */}
          <div className="p-4">
            <p className="text-white whitespace-pre-wrap break-words">{post.content}</p>
            <p className="text-gray-500 text-sm mt-2">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              canGoPrevious
                ? 'bg-[#ff4234] hover:bg-red-600 text-white cursor-pointer'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <div className="text-gray-400 text-sm">
            {currentIndex + 1} / {allPostIds.length}
          </div>

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              canGoNext
                ? 'bg-[#ff4234] hover:bg-red-600 text-white cursor-pointer'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Back to Feed */}
        <button
          onClick={() => router.push('/hub')}
          className="w-full mt-4 bg-[#252525] hover:bg-[#2a2a2a] text-white py-2 rounded-lg transition-colors"
        >
          Back to Feed
        </button>
      </div>
    </div>
  )
}
