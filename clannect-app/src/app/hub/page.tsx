'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Home, Zap, Users, Plus, User, Settings, LogOut, Trash2, Heart, MessageCircle, X, ShoppingCart, Send, Volume, VolumeX, MoreVertical, Pin, Ban, Link, Bookmark, Edit, BarChart, Folder } from 'lucide-react'
import RightSidebar from '../components/RightSidebar'
import GlobalLoading from '../components/GlobalLoading'
import LevelUpModal from '../components/LevelUpModal'
import AvatarWithFrame from '../components/AvatarWithFrame'

// XP system configuration
const XP_CONFIG = {
  profileEdits: { avatar: 10, banner: 10, aboutMe: 30 },
  actions: { post: 10, comment: 3, perFollower: 5 },
  cooldowns: { postHours: 1, commentPeriodsMinutes: 20, commentMax: 5 },
  levelRequirements: [
    { minLevel: 1, maxLevel: 10, xpPerLevel: 50 },
    { minLevel: 10, maxLevel: 30, xpPerLevel: 125 },
    { minLevel: 30, maxLevel: 50, xpPerLevel: 300 },
    { minLevel: 50, maxLevel: 80, xpPerLevel: 700 },
    { minLevel: 80, maxLevel: 90, xpPerLevel: 1500 },
    { minLevel: 90, maxLevel: 101, xpPerLevel: 2000 },
  ]
}

export default function HubPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('hub')
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [allies, setAllies] = useState<any[]>([])
  const [rightSidebarLoading, setRightSidebarLoading] = useState(true)
  const [likeStates, setLikeStates] = useState<Record<string, { isLiked: boolean; count: number }>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null)
  const [postComments, setPostComments] = useState<Record<string, any[]>>({})
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({})
  const [commentsLoadedCount, setCommentsLoadedCount] = useState<Record<string, number>>({})
  const [totalCommentsCount, setTotalCommentsCount] = useState<Record<string, number>>({})
  const [likesModalOpen, setLikesModalOpen] = useState(false)
  const [likesModalPostId, setLikesModalPostId] = useState<string | null>(null)
  const [usersWhoLiked, setUsersWhoLiked] = useState<any[]>([])
  const [likesModalLoading, setLikesModalLoading] = useState(false)
  const [likesModalSearchQuery, setLikesModalSearchQuery] = useState('')
  // Stats modal states
  const [statsModalOpen, setStatsModalOpen] = useState(false)
  const [statsModalPostId, setStatsModalPostId] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsLikesCount, setStatsLikesCount] = useState<number>(0)
  const [statsCommentsCount, setStatsCommentsCount] = useState<number>(0)
  const [statsUsersWhoLiked, setStatsUsersWhoLiked] = useState<any[]>([])
  const [statsUsersWhoCommented, setStatsUsersWhoCommented] = useState<any[]>([])
  const [statsSearchQuery, setStatsSearchQuery] = useState('')
  // Pagination for stats lists
  const [statsLikedOffset, setStatsLikedOffset] = useState(0)
  const [statsCommentedOffset, setStatsCommentedOffset] = useState(0)
  const [statsLikedHasMore, setStatsLikedHasMore] = useState(true)
  const [statsCommentedHasMore, setStatsCommentedHasMore] = useState(true)
  const [statsLikedLoadingMore, setStatsLikedLoadingMore] = useState(false)
  const [statsCommentedLoadingMore, setStatsCommentedLoadingMore] = useState(false)
  const [commentLikeStates, setCommentLikeStates] = useState<Record<string, { isLiked: boolean; count: number }>>({})
  const [loadingCommentLikes, setLoadingCommentLikes] = useState<Record<string, boolean>>({})
  
  // Comment cooldown tracking
  const [commentsInWindow, setCommentsInWindow] = useState(0)
  const [commentCooldownRemaining, setCommentCooldownRemaining] = useState(0)
  const [commentCooldownActive, setCommentCooldownActive] = useState(false)
  
  // Follow states for posts
  const [followStates, setFollowStates] = useState<Record<string, { isFollowing: boolean; isLoading: boolean }>>({})
  
  // Ally states for posts
  const [allyStates, setAllyStates] = useState<Record<string, boolean>>({})
  
  // Level up modal states
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false)
  const [newLevelValue, setNewLevelValue] = useState(0)
  const [levelUpCloinReward, setLevelUpCloinReward] = useState(0)
  // Verification modal removed — all accounts verified
  
  // Fullscreen media state
  const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null)
  
  // Ally request notification
  const [allyRequestCount, setAllyRequestCount] = useState(0)
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null)
  const [soundBlockedPosts, setSoundBlockedPosts] = useState<Set<string>>(new Set())
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false)
  const [showGlobalClickPrompt, setShowGlobalClickPrompt] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  
  // Pagination state
  const [postsOffset, setPostsOffset] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false)
  const [isCheckingForMore, setIsCheckingForMore] = useState(false)
  
  // Share feature state
  const [sharePostId, setSharePostId] = useState<string | null>(null)
  const [shareSearchQuery, setShareSearchQuery] = useState('')
  const [shareConversations, setShareConversations] = useState<any[]>([])
  const [selectedShareRecipients, setSelectedShareRecipients] = useState<Set<string>>(new Set())
  const [isLoadingShareConversations, setIsLoadingShareConversations] = useState(false)
  const [conversationDMPermissions, setConversationDMPermissions] = useState<Record<string, boolean>>({})
  
  const postRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const feedContainerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [copiedLinkPostId, setCopiedLinkPostId] = useState<string | null>(null)
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set())
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
  const [isBlockingUser, setIsBlockingUser] = useState(false)
  const [showBlockConfirmation, setShowBlockConfirmation] = useState(false)
  const [blockTarget, setBlockTarget] = useState<{ id: string; displayName: string } | null>(null)
  const lastScrollCheckRef = useRef<number>(0)
  const loadingMoreRef = useRef<boolean>(false)
  // Initialize to true if URL has a specific post ID - block scroll listener until navigation is done
  const isExplicitNavigationRef = useRef<boolean>(
    typeof window !== 'undefined' && /\/hub\/post\/([^\/]+)/.test(window.location.pathname)
  )
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const supabase = createClient()

  // Fetch user's collections
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        if (!user) return
        setCollectionsLoading(true)
        const { data } = await supabase
          .from('collections')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })

        if (data) setCollections(data)
      } catch (err) {
        console.error('Error fetching collections', err)
      } finally {
        setCollectionsLoading(false)
      }
    }

    fetchCollections()
  }, [user, supabase])

  const openSaveModal = (postId: string) => {
    setSaveModalPostId(postId)
    setSelectedCollectionId(null)
    setSaveModalOpen(true)
  }

  const savePostToCollection = async (collectionId: string) => {
    if (!saveModalPostId) return
    try {
      setSavingCollection(true)
      // find collection
      const col = collections.find((c) => c.collection_id === collectionId)
      const existing = Array.isArray(col?.saved_posts) ? col.saved_posts : []
      if (existing.includes(saveModalPostId)) {
        // already saved
        setSaveModalOpen(false)
        return
      }

      const newArray = [...existing, saveModalPostId]
      const { data, error } = await supabase
        .from('collections')
        .update({ saved_posts: newArray })
        .eq('collection_id', collectionId)
        .select()

      if (error) throw error
      if (data && data[0]) {
        setCollections(prev => prev.map(c => c.collection_id === collectionId ? data[0] : c))
      }
      setSaveModalOpen(false)
    } catch (err) {
      console.error('Error saving post to collection', err)
    } finally {
      setSavingCollection(false)
    }
  }

  // All collection post snapshots are read from the database; no local cache.

  const removePostFromCollection = async (collectionId: string, postId: string) => {
    try {
      const col = collections.find((c) => c.collection_id === collectionId)
      const existing = Array.isArray(col?.saved_posts) ? col.saved_posts : []
      const newArray = existing.filter((id: string) => id !== postId)
      const { data, error } = await supabase
        .from('collections')
        .update({ saved_posts: newArray })
        .eq('collection_id', collectionId)
        .select()

      if (error) throw error
      if (data && data[0]) {
        setCollections(prev => prev.map(c => c.collection_id === collectionId ? data[0] : c))
      }
      // no-op: cache removed (no local cache used)
    } catch (err) {
      console.error('Error removing post from collection', err)
    }
  }

  // Collections / save-to-collection state
  const [collections, setCollections] = useState<any[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveModalPostId, setSaveModalPostId] = useState<string | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [savingCollection, setSavingCollection] = useState(false)

  // Observe posts and autoplay/loop videos when a post is visible
  useEffect(() => {
    // Initialize audio preference from localStorage
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('clannectAudioEnabled') : null
      if (stored === 'true') setAudioEnabled(true)
    } catch (e) {}

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    // disconnect previous observer
    intersectionObserverRef.current?.disconnect()

    intersectionObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement
        const postId = el.dataset.postId
        if (!postId) return

        const videos = Array.from(el.querySelectorAll('video')) as HTMLVideoElement[]

        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          setVisiblePostId(postId)
          videos.forEach((v) => {
            try {
              v.loop = true
              v.playsInline = true

              // If user enabled audio via global toggle, try to play with sound.
              if (audioEnabled) {
                v.muted = false
                const p = v.play()
                if (p && typeof p.then === 'function') {
                  p.catch(() => {
                    // If blocked, fall back to muted playback and mark blocked
                    v.muted = true
                    setSoundBlockedPosts((prev) => {
                      const copy = new Set(prev)
                      copy.add(postId)
                      return copy
                    })
                  })
                }
              } else {
                // default: play muted to satisfy autoplay policies
                v.muted = true
                const p = v.play()
                if (p && typeof p.then === 'function') p.catch(() => {})
              }
            } catch (e) {
              // ignore play errors
            }
          })
        } else {
          if (visiblePostId === postId) setVisiblePostId(null)
          videos.forEach((v) => {
            try {
              v.pause()
            } catch (e) {}
          })
        }
      })
    }, { threshold: [0.25, 0.5, 0.75] })

    // observe current posts
    postRefs.current.forEach((el) => {
      try { intersectionObserverRef.current?.observe(el) } catch (e) {}
    })

    return () => {
      intersectionObserverRef.current?.disconnect()
    }
  }, [posts, visiblePostId])

  // If audio was enabled but autoplay with sound was blocked, show a global prompt
  // and attach a one-time click listener so the user's next click will unmute all videos.
  useEffect(() => {
    if (!audioEnabled) {
      setShowGlobalClickPrompt(false)
      return
    }

    const hasBlocked = soundBlockedPosts.size > 0
    setShowGlobalClickPrompt(hasBlocked)

    if (!hasBlocked) return

    const handler = (e: MouseEvent) => {
      // On first user click anywhere, unmute and play videos only for the currently visible post
      try {
        // persist approval so future sessions will prefer unmuted autoplay
        try { localStorage.setItem('clannectAudioEnabled', 'true') } catch (err) {}
        setAudioEnabled(true)

        if (visiblePostId) {
          const el = postRefs.current.get(visiblePostId)
          if (el) {
            const videos = Array.from(el.querySelectorAll('video')) as HTMLVideoElement[]
            videos.forEach((v) => {
              try {
                v.muted = false
                const p = v.play()
                if (p && typeof p.then === 'function') p.catch(() => {})
              } catch (err) {}
            })
          }
          // Clear blocked posts entirely — user gesture should allow future autoplay
          setSoundBlockedPosts(new Set())
        }
      } catch (err) {}

      setShowGlobalClickPrompt(false)
      window.removeEventListener('click', handler)
    }

    // Use capture phase so this runs before other click handlers (prevents navigation
    // or other handlers from interfering with the one-time gesture that enables audio)
    window.addEventListener('click', handler, { capture: true })
    return () => window.removeEventListener('click', handler, { capture: true })
  }, [audioEnabled, soundBlockedPosts])

  // Log initial navigation state
  if (typeof window !== 'undefined') {
    console.log('[HubPage Init] pathname:', pathname, 'isExplicitNavigation:', isExplicitNavigationRef.current)
  }

  // Check comment cooldown and track remaining comments
  const checkCommentCooldown = async (): Promise<boolean> => {
    if (!user) return false
    try {
      // Get the user's profile to check comment timestamps
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_comment_timestamps')
        .eq('id', user.id)
        .single()
      
      if (!profile || !profile.last_comment_timestamps || profile.last_comment_timestamps.length === 0) {
        setCommentsInWindow(0)
        setCommentCooldownActive(false)
        setCommentCooldownRemaining(0)
        return false
      }
      
      const timestamps = profile.last_comment_timestamps
      const now = new Date()
      const twentyMinutesAgo = new Date(now.getTime() - XP_CONFIG.cooldowns.commentPeriodsMinutes * 60 * 1000)
      
      // Filter timestamps that are still within the 20-minute window
      const recentTimestamps = timestamps.filter((ts: string) => new Date(ts) > twentyMinutesAgo)
      setCommentsInWindow(recentTimestamps.length)
      
      // If user already has 5 comments posted in window, cooldown is active (no XP for new comments)
      // This check ensures only the first 5 comments earn XP
      if (recentTimestamps.length >= 5) {
        const oldestTimestamp = new Date(Math.min(...recentTimestamps.map((ts: string) => new Date(ts).getTime())))
        const cooldownEnd = new Date(oldestTimestamp.getTime() + XP_CONFIG.cooldowns.commentPeriodsMinutes * 60 * 1000)
        const remainingMs = cooldownEnd.getTime() - now.getTime()
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
        setCommentCooldownRemaining(remainingSeconds)
        setCommentCooldownActive(remainingSeconds > 0)
        return remainingSeconds > 0
      } else {
        setCommentCooldownActive(false)
        setCommentCooldownRemaining(0)
        return false
      }
    } catch (err) {
      console.error('Error checking comment cooldown:', err)
      return false
    }
  }

    // Open stats modal and fetch likes/comments and user lists
    const openStatsModal = async (postId: string | null) => {
      if (!postId) return
      setStatsModalOpen(true)
      setStatsModalPostId(postId)
      setStatsLoading(true)
      setStatsLikesCount(0)
      setStatsCommentsCount(0)
      setStatsUsersWhoLiked([])
      setStatsUsersWhoCommented([])

      try {
        const { count: likesCount } = await supabase
          .from('post_likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId)

        const { count: commentsCount } = await supabase
          .from('post_comments')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId)

        setStatsLikesCount(likesCount || 0)
        setStatsCommentsCount(commentsCount || 0)

        // reset pagination and fetch first page
        setStatsLikedOffset(0)
        setStatsCommentedOffset(0)
        setStatsUsersWhoLiked([])
        setStatsUsersWhoCommented([])
        setStatsLikedHasMore(true)
        setStatsCommentedHasMore(true)

        await Promise.all([
          fetchStatsLikedPage(postId, 0),
          fetchStatsCommentedPage(postId, 0),
        ])
      } catch (err) {
        console.error('Error fetching post stats:', err)
      } finally {
        setStatsLoading(false)
      }
    }

    // Fetch a page of users who liked (10 per page)
    const fetchStatsLikedPage = async (postId: string, offset: number) => {
      try {
        if (offset === 0) setStatsLikedLoadingMore(false)
        else setStatsLikedLoadingMore(true)

        const { data: likesData } = await supabase
          .from('post_likes')
          .select('user_id')
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .range(offset, offset + 9)

        const userIds = (likesData || []).map((l: any) => l.user_id)
        if (userIds.length === 0) {
          if (offset === 0) setStatsUsersWhoLiked([])
          setStatsLikedHasMore(false)
          setStatsLikedLoadingMore(false)
          return
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, equipped_frame')
          .in('id', userIds)

        setStatsUsersWhoLiked(prev => [...prev, ...(profiles || [])])
        setStatsLikedOffset(offset)
        setStatsLikedHasMore((likesData || []).length === 10)
      } catch (err) {
        console.error('Error fetching liked page:', err)
      } finally {
        setStatsLikedLoadingMore(false)
      }
    }

    // Fetch a page of users who commented (10 per page, distinct users)
    const fetchStatsCommentedPage = async (postId: string, offset: number) => {
      try {
        if (offset === 0) setStatsCommentedLoadingMore(false)
        else setStatsCommentedLoadingMore(true)

        const { data: commenters } = await supabase
          .from('post_comments')
          .select('user_id')
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .range(offset, offset + 9)

        const userIds = Array.from(new Set((commenters || []).map((c: any) => c.user_id)))
        if (userIds.length === 0) {
          if (offset === 0) setStatsUsersWhoCommented([])
          setStatsCommentedHasMore(false)
          setStatsCommentedLoadingMore(false)
          return
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, equipped_frame')
          .in('id', userIds)

        setStatsUsersWhoCommented(prev => [...prev, ...(profiles || [])])
        setStatsCommentedOffset(offset)
        setStatsCommentedHasMore((commenters || []).length === 10)
      } catch (err) {
        console.error('Error fetching commented page:', err)
      } finally {
        setStatsCommentedLoadingMore(false)
      }
    }

  // Close open post menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuPostId(null)
      }
    }

    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  // Generate consistent gradient color for user based on their ID
  const generateProfileGradient = (userId: string) => {
    const gradients = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-red-500 to-orange-500',
      'from-green-500 to-teal-500',
      'from-indigo-500 to-blue-500',
      'from-yellow-500 to-orange-500',
      'from-pink-500 to-rose-500',
      'from-violet-500 to-purple-500',
      'from-emerald-500 to-teal-500',
      'from-amber-500 to-yellow-500',
    ]
    
    // Use user ID to consistently pick same color
    const index = userId.charCodeAt(0) % gradients.length
    return gradients[index]
  }

  // Calculate level from total XP
  const calculateLevelFromXp = (totalXp: number): number => {
    let level = 1
    let xpUsed = 0
    while (level < 100) {
      const config = XP_CONFIG.levelRequirements.find(c => level >= c.minLevel && level < c.maxLevel)
      if (!config) break
      const xpNeeded = config.xpPerLevel
      if (xpUsed + xpNeeded > totalXp) break
      xpUsed += xpNeeded
      level++
    }
    return level
  }

  // Handle level up and award cloin
  const handleLevelUpAndAwardCloin = async (oldLevel: number, newLevel: number) => {
    if (newLevel > oldLevel) {
      const levelDifference = newLevel - oldLevel
      const cloinReward = levelDifference * 20
      
      // Update profile with new cloin
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('cloin')
        .eq('id', user.id)
        .single()
      
      if (currentProfile) {
        const newCloin = (currentProfile.cloin || 0) + cloinReward
        await supabase
          .from('profiles')
          .update({ cloin: newCloin })
          .eq('id', user.id)
        
        // Show modal with correct reward amount
        setNewLevelValue(newLevel)
        setLevelUpCloinReward(cloinReward)
        setLevelUpModalOpen(true)
        
        // Update local profile state
        setProfile((prev: any) => ({
          ...prev,
          cloin: newCloin,
          level: newLevel
        }))
      }
    }
  }


  const handleDeletePost = async (postId: string) => {
    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
      
      if (error) {
        console.error('Error deleting post:', error)
        alert('Failed to delete post. Please try again.')
      } else {
        // Remove post from local state
        setPosts(posts.filter(post => post.id !== postId))
        setDeleteModalOpen(false)
        setPostToDelete(null)
      }
    } catch (err) {
      console.error('Exception while deleting post:', err)
      alert('An error occurred while deleting the post.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Copy post link to clipboard
  const handleCopyLink = async (postId: string) => {
    const url = (typeof window !== 'undefined' ? window.location.origin : '') + `/hub/post/${postId}`
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = url
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedLinkPostId(postId)
      setOpenMenuPostId(null)
      setTimeout(() => setCopiedLinkPostId(null), 1500)
    } catch (err) {
      console.error('Failed to copy link:', err)
      alert('Failed to copy link')
    }
  }

  // Block a user (copied from conversation page behavior)
  const handleBlockUser = async () => {
    if (!user || !blockTarget?.id || isBlockingUser) return

    setIsBlockingUser(true)
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: blockTarget.id
        })

      if (error) {
        console.error('Error blocking user:', error)
        return
      }

      // Update local blocked set and remove their posts from the feed immediately
      setBlockedUserIds(prev => {
        const copy = new Set(prev)
        copy.add(blockTarget.id)
        return copy
      })
      setPosts(prev => prev.filter(p => p.user_id !== blockTarget.id))

      setShowBlockConfirmation(false)
      setBlockTarget(null)
    } catch (err) {
      console.error('Error blocking user:', err)
    } finally {
      setIsBlockingUser(false)
    }
  }

  // Toggle pin/unpin a post to the current user's profile
  const togglePin = async (postId: string) => {
    if (!user || !profile) return

    try {
      const currentPinned: string[] = Array.isArray(profile.pinned_posts) ? profile.pinned_posts : []
      // Enforce pin limit of 1
      if (!currentPinned.includes(postId) && currentPinned.length >= 1) {
        alert('You can only pin 1 post to your profile')
        return
      }
      let newPinned: string[]
      if (currentPinned.includes(postId)) {
        // Unpin
        newPinned = currentPinned.filter(id => id !== postId)
      } else {
        // Pin: add to front
        newPinned = [postId, ...currentPinned.filter(id => id !== postId)]
      }

      const { error } = await supabase
        .from('profiles')
        .update({ pinned_posts: newPinned })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating pinned_posts:', error)
        return
      }

      // Update local profile state
      setProfile((p: any) => p ? { ...p, pinned_posts: newPinned } : p)

      // Notify other parts of app (profile pages) to update pinned posts UI
      window.dispatchEvent(new Event('pinnedPostsChanged'))
    } catch (err) {
      console.error('Exception toggling pin:', err)
    }
  }

  // Load more posts (called when scrolling to bottom)
  const loadMorePosts = async () => {
    if (loadingMoreRef.current || !hasMorePosts) return
    
    loadingMoreRef.current = true
    setIsLoadingMorePosts(true)
    
    try {
      const newOffset = postsOffset + 10
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(newOffset, newOffset + 9) // Load 10 more posts
      
      if (postsError) {
        console.error('Error loading more posts:', postsError)
        setHasMorePosts(false)
        return
      }
      
      if (!postsData || postsData.length === 0) {
        setHasMorePosts(false)
        return
      }
      
      setHasMorePosts(postsData.length >= 10)

      // Filter out posts from blocked users
      const newPostsData = postsData.filter(p => !blockedUserIds.has(p.user_id))

      // Fetch profiles for new post authors
      const userIds = [...new Set(newPostsData.map(post => post.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, equipped_frame')
        .in('id', userIds)

      const profilesMap = new Map()
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile)
      })

      const enrichedPosts = newPostsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id),
      }))
      
      // Add new posts and maintain 40-post limit
      setPosts(prev => {
        const updated = [...prev, ...enrichedPosts]
        // Keep only last 40 posts
        if (updated.length > 40) {
          return updated.slice(-40)
        }
        return updated
      })
      
      // Update offset
      setPostsOffset(newOffset)
      
      // Initialize like states for new posts
      enrichedPosts.forEach(post => {
        setLikeStates(prev => ({
          ...prev,
          [post.id]: { isLiked: false, count: 0 }
        }))
      })
      
      console.log(`[Infinite Scroll] Loaded 10 more posts. Total posts: ${enrichedPosts.length}`)
    } catch (err) {
      console.error('Error in loadMorePosts:', err)
      setHasMorePosts(false)
    } finally {
      loadingMoreRef.current = false
      setIsLoadingMorePosts(false)
    }
  }

  // Fetch user's conversations for share feature
  const fetchShareConversations = async () => {
    if (!user) {
      console.log('[Share] No user logged in')
      return
    }
    
    // Clear previous cached permissions to ensure fresh check
    setConversationDMPermissions({})
    setShareConversations([])
    setIsLoadingShareConversations(true)
    try {
      console.log('[Share] Fetching conversations for user:', user.id)
      
      // Get all conversations for the current user from conversation_members
      const { data: userConversations, error: convError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id)

      console.log('[Share] Fetch result - Error:', convError, 'Data:', userConversations)

      if (convError) {
        console.error('Error fetching conversations:', convError)
        setShareConversations([])
        return
      }

      if (!userConversations || userConversations.length === 0) {
        console.log('[Share] No conversations found')
        setShareConversations([])
        return
      }

      console.log('[Share] Found conversations:', userConversations.length)

      // For each conversation, get the other member
      const conversationsWithProfiles: any[] = []
      const dmPermissions: Record<string, boolean> = {}

      for (const conv of userConversations) {
        console.log('[Share] Processing conversation:', conv.conversation_id)
        
        // Get the other user in this conversation
        const { data: members, error: memberError } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id)
          .neq('user_id', user.id)

        if (memberError) {
          console.error('Error fetching members for conversation:', memberError)
          continue
        }

        if (!members || members.length === 0) {
          console.log('[Share] No other members found in conversation:', conv.conversation_id)
          continue
        }

        const otherUserId = members[0].user_id
        console.log('[Share] Other user ID:', otherUserId)

        // Get the other user's profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, equipped_frame')
          .eq('id', otherUserId)
          .single()

        if (profileError) {
          console.error('[Share] Error fetching profile for', otherUserId, ':', profileError)
          continue
        }

        console.log('[Share] Got profile:', profile?.display_name)

        // Check if we can message this user
        // Fetch the other user's DM privacy settings
        const { data: otherUserSettings } = await supabase
          .from('user_settings')
          .select('dm_permissions')
          .eq('user_id', otherUserId)
          .maybeSingle()

        const dmPermissionSetting = otherUserSettings?.dm_permissions || 'everyone'
        console.log('[Share] Other user DM permission:', dmPermissionSetting)

        let canMessage = false

        // Check based on their privacy setting
        if (dmPermissionSetting === 'everyone') {
          // They accept DMs from everyone
          canMessage = true
        } else if (dmPermissionSetting === 'allies_only') {
          // Check if we are allies (using allies table like conversation page)
          const { data: allyCheck1 } = await supabase
            .from('allies')
            .select('id')
            .eq('user_id', user.id)
            .eq('ally_id', otherUserId)
            .maybeSingle()

          const { data: allyCheck2 } = await supabase
            .from('allies')
            .select('id')
            .eq('user_id', otherUserId)
            .eq('ally_id', user.id)
            .maybeSingle()

          const areAllies = !!(allyCheck1 || allyCheck2)
          console.log('[Share] allies_only check - areAllies:', areAllies)
          canMessage = areAllies
        } else if (dmPermissionSetting === 'nobody') {
          // They don't accept DMs
          canMessage = false
        }

        // Check if either user has blocked the other
        if (canMessage) {
          const { data: iBlockedThem } = await supabase
            .from('blocked_users')
            .select('id')
            .eq('blocker_id', user.id)
            .eq('blocked_id', otherUserId)
            .maybeSingle()

          const { data: theyBlockedMe } = await supabase
            .from('blocked_users')
            .select('id')
            .eq('blocker_id', otherUserId)
            .eq('blocked_id', user.id)
            .maybeSingle()

          if (iBlockedThem || theyBlockedMe) {
            console.log('[Share] Block detected - cannot message')
            canMessage = false
          }
        }

        console.log('[Share] Can message', profile?.display_name, ':', canMessage)

        conversationsWithProfiles.push({
          conversation_id: conv.conversation_id,
          id: conv.conversation_id, // Add this for UI compatibility
          otherUserId,
          profile
        })

        dmPermissions[conv.conversation_id] = canMessage
        console.log('[Share] Added conversation with', profile?.display_name)
      }

      setShareConversations(conversationsWithProfiles)
      setConversationDMPermissions(dmPermissions)
      setSelectedShareRecipients(new Set())
      
      console.log('[Share] Conversations loaded:', conversationsWithProfiles.length)
    } catch (err) {
      console.error('Error in fetchShareConversations:', err)
      setShareConversations([])
    } finally {
      setIsLoadingShareConversations(false)
    }
  }

  // Send shared post to selected conversations
  const handleSharePost = async () => {
    if (!sharePostId || selectedShareRecipients.size === 0) return

    try {
      console.log('[Share] Sending post', sharePostId, 'to', selectedShareRecipients.size, 'conversations')
      setIsLoadingShareConversations(true)

      // Send message to each selected conversation
      for (const conversationId of selectedShareRecipients) {
        const { error } = await supabase
          .from('messages')
          .insert([
            {
              conversation_id: conversationId,
              sender_id: user?.id,
              content: null,
              post_id: sharePostId,
              media_url: null,
            },
          ])

        if (error) {
          console.error('Error sending message to conversation', conversationId, ':', error)
        } else {
          console.log('[Share] Message sent to conversation:', conversationId)
        }
      }

      // Close share modal
      setSharePostId(null)
      setShareSearchQuery('')
      setSelectedShareRecipients(new Set())
      
      alert('Post shared successfully!')
    } catch (err) {
      console.error('Error sharing post:', err)
      alert('Failed to share post. Please try again.')
    } finally {
      setIsLoadingShareConversations(false)
    }
  }

  // Fetch and set like and comment stats for a post
  const fetchPostStats = async (postId: string, userId: string) => {
    try {
      // Fetch like count for post
      const { count: likeCount, error: likeCountError } = await supabase
        .from('post_likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)

      // Check if current user has liked this post
      const { data: userLikeData, error: userLikeError } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)

      // Fetch comment count
      const { count: commentCount, error: commentCountError } = await supabase
        .from('post_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)

      setLikeStates(prev => ({
        ...prev,
        [postId]: {
          isLiked: !!(userLikeData && userLikeData.length > 0),
          count: likeCount || 0
        }
      }))

      setCommentCounts(prev => ({
        ...prev,
        [postId]: commentCount || 0
      }))
    } catch (err) {
      console.error('Error fetching post stats:', err)
    }
  }

  // Toggle like on a post
  const toggleLike = async (postId: string) => {
    if (!user) return
    
    // Find the post to check ownership
    const post = posts.find(p => p.id === postId)
    if (post?.user_id === user.id) {
      alert('You cannot like your own post')
      return
    }
    
    try {
      const currentState = likeStates[postId]
      
      if (currentState?.isLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        
        if (error) {
          console.error('Error unliking post:', error)
        } else {
          setLikeStates(prev => ({
            ...prev,
            [postId]: {
              ...prev[postId],
              isLiked: false,
              count: Math.max(0, (prev[postId]?.count || 0) - 1)
            }
          }))
        }
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert([{ post_id: postId, user_id: user.id }])
        
        if (error) {
          console.error('Error liking post:', error)
        } else {
          setLikeStates(prev => ({
            ...prev,
            [postId]: {
              ...prev[postId],
              isLiked: true,
              count: (prev[postId]?.count || 0) + 1
            }
          }))
        }
      }
    } catch (err) {
      console.error('Exception while toggling like:', err)
    }
  }

  // Fetch comments for a post with lazy loading (10 at a time)
  const fetchPostComments = async (postId: string, loadMore: boolean = false) => {
    const COMMENTS_PER_PAGE = 10
    const currentLoaded = commentsLoadedCount[postId] || 0
    const offset = loadMore ? currentLoaded : 0

    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }))
      
      // Fetch total count of comments for this post
      if (!loadMore) {
        const { count } = await supabase
          .from('post_comments')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId)
        
        setTotalCommentsCount(prev => ({ ...prev, [postId]: count || 0 }))
      }

      // Fetch comments with pagination
      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('id, content, user_id, created_at, updated_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .range(offset, offset + COMMENTS_PER_PAGE - 1)
      
      if (error) {
        console.error('Error fetching comments:', error)
        if (!loadMore) {
          setPostComments(prev => ({ ...prev, [postId]: [] }))
        }
        return
      }

      if (!comments || comments.length === 0) {
        if (!loadMore) {
          setPostComments(prev => ({ ...prev, [postId]: [] }))
        }
        setLoadingComments(prev => ({ ...prev, [postId]: false }))
        return
      }

      // Fetch user profiles for all commenters
      const userIds = [...new Set(comments.map(c => c.user_id))]
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)

      if (profileError) {
        console.error('Error fetching comment author profiles:', profileError)
      }

      // Map profiles to comments
      const profilesMap = new Map()
      profiles?.forEach(p => {
        profilesMap.set(p.id, p)
      })

      const enrichedComments = comments.map(c => ({
        ...c,
        profiles: profilesMap.get(c.user_id)
      }))

      // Update comments list
      setPostComments(prev => ({
        ...prev,
        [postId]: loadMore 
          ? [...(prev[postId] || []), ...enrichedComments]
          : enrichedComments
      }))

      // Update loaded count
      setCommentsLoadedCount(prev => ({
        ...prev,
        [postId]: offset + enrichedComments.length
      }))

      // Fetch like stats for all comments
      enrichedComments.forEach(comment => {
        fetchCommentLikeStats(comment.id, user?.id || '')
      })
    } catch (err) {
      console.error('Exception while fetching comments:', err)
      if (!loadMore) {
        setPostComments(prev => ({ ...prev, [postId]: [] }))
      }
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  // Add a comment to a post
  const addComment = async (postId: string, content: string) => {
    const MAX_COMMENT_LENGTH = 1000
    
    if (!user || !content.trim()) return
    
    // Set submitting state immediately to prevent multiple submissions
    setSubmittingComments(prev => ({ ...prev, [postId]: true }))
    
    if (content.length > MAX_COMMENT_LENGTH) {
      alert(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`)
      setSubmittingComments(prev => ({ ...prev, [postId]: false }))
      return
    }

    // Check comment cooldown info (but don't block comment)
    await checkCommentCooldown()
    
    try {
      // Insert comment
      const { data, error } = await supabase
        .from('post_comments')
        .insert([{ post_id: postId, user_id: user.id, content }])
        .select('id, content, user_id, created_at, updated_at')
      
      if (error) {
        console.error('Error adding comment:', error)
        alert('Failed to add comment. Please try again.')
      } else if (data && data.length > 0) {
        // Fetch the profile for the new comment author
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, equipped_frame')
          .eq('id', user.id)
          .single()

        const enrichedComment = {
          ...data[0],
          profiles: profileData
        }

        // Update comments list
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), enrichedComment]
        }))
        
        // Update comment count
        setCommentCounts(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1
        }))
        
        // Update total count
        setTotalCommentsCount(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1
        }))
        
        // Update loaded count
        setCommentsLoadedCount(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1
        }))
        
        // Initialize comment like state
        setCommentLikeStates(prev => ({
          ...prev,
          [enrichedComment.id]: { isLiked: false, count: 0 }
        }))
        
        // Check if user is on cooldown BEFORE awarding XP
        const isOnCooldown = await checkCommentCooldown()
        
        // Only award XP if NOT on cooldown
        if (!isOnCooldown) {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('xp, level')
            .eq('id', user.id)
            .single()
          
          if (currentProfile) {
            const newXp = currentProfile.xp + XP_CONFIG.actions.comment
            const newLevel = calculateLevelFromXp(newXp)
            const oldLevel = currentProfile.level || 1
            
            await supabase
              .from('profiles')
              .update({ xp: newXp, level: newLevel })
              .eq('id', user.id)
            
            // Handle level up and cloin reward
            if (newLevel > oldLevel) {
              await handleLevelUpAndAwardCloin(oldLevel, newLevel)
            }
            
            console.log(`✨ Earned ${XP_CONFIG.actions.comment} XP from commenting!`)
          }
        } else {
          console.log('⚠️ Comment posted but no XP earned - cooldown active')
        }
        
        // Update comment timestamp tracking (for cooldown enforcement, independent of deletion)
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('last_comment_timestamps')
          .eq('id', user.id)
          .single()
        
        if (currentProfile) {
          const timestamps = currentProfile.last_comment_timestamps || []
          const now = new Date().toISOString()
          // Keep only the last 5 timestamps (remove oldest if we already have 5)
          const updatedTimestamps = [...timestamps, now].slice(-5)
          await supabase
            .from('profiles')
            .update({ last_comment_timestamps: updatedTimestamps })
            .eq('id', user.id)
        }
        
        // Clear input and submitting state
        setNewCommentText(prev => ({ ...prev, [postId]: '' }))
        setSubmittingComments(prev => ({ ...prev, [postId]: false }))
      }
    } catch (err) {
      console.error('Exception while adding comment:', err)
      alert('An error occurred while adding the comment.')
      setSubmittingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  // Delete a comment
  const deleteComment = async (commentId: string, postId: string) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Error deleting comment:', error)
        alert('Failed to delete comment. Please try again.')
      } else {
        // Update comments list
        setPostComments(prev => ({
          ...prev,
          [postId]: prev[postId]?.filter(c => c.id !== commentId) || []
        }))
        
        // Update comment count
        setCommentCounts(prev => ({
          ...prev,
          [postId]: Math.max(0, (prev[postId] || 0) - 1)
        }))
      }
    } catch (err) {
      console.error('Exception while deleting comment:', err)
      alert('An error occurred while deleting the comment.')
    }
  }

  // Fetch users who liked a post
  const fetchUsersWhoLiked = async (postId: string) => {
    try {
      setLikesModalLoading(true)
      
      // Fetch user IDs who liked the post
      const { data: likes, error: likesError } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', postId)
      
      if (likesError) {
        console.error('Error fetching likes:', likesError)
        setUsersWhoLiked([])
        return
      }

      if (!likes || likes.length === 0) {
        setUsersWhoLiked([])
        setLikesModalLoading(false)
        return
      }

      // Fetch profiles for all users who liked
      const userIds = likes.map(like => like.user_id)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, equipped_frame')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError)
        setUsersWhoLiked([])
      } else {
        setUsersWhoLiked(profiles || [])
      }
    } catch (err) {
      console.error('Exception while fetching users who liked:', err)
      setUsersWhoLiked([])
    } finally {
      setLikesModalLoading(false)
    }
  }

  // Fetch comment like stats
  const fetchCommentLikeStats = async (commentId: string, userId: string) => {
    try {
      // Fetch like count for comment
      const { count: likeCount, error: likeCountError } = await supabase
        .from('comment_likes')
        .select('id', { count: 'exact', head: true })
        .eq('comment_id', commentId)

      // Check if current user has liked this comment
      const { data: userLikeData, error: userLikeError } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)

      setCommentLikeStates(prev => ({
        ...prev,
        [commentId]: {
          isLiked: !!(userLikeData && userLikeData.length > 0),
          count: likeCount || 0
        }
      }))
    } catch (err) {
      console.error('Error fetching comment like stats:', err)
    }
  }

  // Toggle like on a comment
  const toggleCommentLike = async (commentId: string) => {
    if (!user) return
    
    try {
      const currentState = commentLikeStates[commentId]
      
      if (currentState?.isLiked) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
        
        if (error) {
          console.error('Error unliking comment:', error)
        } else {
          setCommentLikeStates(prev => ({
            ...prev,
            [commentId]: {
              ...prev[commentId],
              isLiked: false,
              count: Math.max(0, (prev[commentId]?.count || 0) - 1)
            }
          }))
        }
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert([{ comment_id: commentId, user_id: user.id }])
        
        if (error) {
          console.error('Error liking comment:', error)
        } else {
          setCommentLikeStates(prev => ({
            ...prev,
            [commentId]: {
              ...prev[commentId],
              isLiked: true,
              count: (prev[commentId]?.count || 0) + 1
            }
          }))
        }
      }
    } catch (err) {
      console.error('Exception while toggling comment like:', err)
    }
  }

  // Toggle follow on a post author
  const toggleFollow = async (authorId: string) => {
    if (!user || user.id === authorId) return
    
    try {
      setFollowStates(prev => ({
        ...prev,
        [authorId]: { ...prev[authorId], isLoading: true }
      }))
      
      const currentState = followStates[authorId]
      
      if (currentState?.isFollowing) {
        // Unfollow
        try {
          const response = await fetch('/api/toggle-follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authorId,
              followerUserId: user.id,
              action: 'unfollow',
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error('Error unfollowing user:', errorData)
          } else {
            const result = await response.json()
            console.log('Unfollow response:', result)
            
            if (result.updatedCount > 0) {
              setFollowStates(prev => ({
                ...prev,
                [authorId]: { isFollowing: false, isLoading: false }
              }))
              console.log('✓ Successfully unfollowed user')
            } else {
              console.warn('Unfollow returned success but no rows were updated')
            }
          }
        } catch (err) {
          console.error('Exception while unfollowing:', err)
        }
      } else {
        // Follow
        try {
          const response = await fetch('/api/toggle-follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authorId,
              followerUserId: user.id,
              action: 'follow',
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error('Error following user:', errorData)
          } else {
            const result = await response.json()
            const shouldAwardXp = result.shouldAwardXp
            
            setFollowStates(prev => ({
              ...prev,
              [authorId]: { isFollowing: true, isLoading: false }
            }))
            
            // Award 5 XP to the followed user for gaining a new follower (only if not awarded before)
            if (shouldAwardXp) {
              try {
                const xpResponse = await fetch('/api/award-follower-xp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    followedUserId: authorId,
                    followerUserId: user.id,
                  }),
                })

                if (!xpResponse.ok) {
                  const errorData = await xpResponse.json()
                  console.error('Error awarding follower XP:', errorData)
                } else {
                  const result = await xpResponse.json()
                  console.log(`✨ ${result.message}`)
                  
                  // Update the followed user's XP in the posts list (real-time display)
                  setPosts(prev => prev.map(post => 
                    post.user_id === authorId && post.profiles
                      ? {
                          ...post,
                          profiles: {
                            ...post.profiles,
                            xp: result.newXp,
                            level: result.newLevel
                          }
                        }
                      : post
                  ))
                }
              } catch (xpError) {
                console.error('Exception while awarding follower XP:', xpError)
              }
            } else {
              console.log('🔄 User previously followed, no XP awarded')
            }
          }
        } catch (err) {
          console.error('Exception while following:', err)
        }
      }
    } catch (err) {
      console.error('Exception while toggling follow:', err)
    } finally {
      setFollowStates(prev => ({
        ...prev,
        [authorId]: { ...prev[authorId], isLoading: false }
      }))
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth error:', error)
          router.push('/login')
          return
        }

        if (!session) {
          console.warn('No active session found; redirecting to /login')
          router.push('/login')
          return
        }
        
        setUser(session.user)
        
        // Fetch user profile (or create if doesn't exist)
        let profileData = null
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (existingProfile) {
          // If a pending username was provided at signup, ensure it overwrites any
          // auto-created profile username (e.g., from a DB trigger). This makes
          // the username reflect what the user entered on signup.
          let pendingUsername: string | null = null
          try {
            if (typeof window !== 'undefined') {
              pendingUsername = localStorage.getItem('clannect_pending_username')
            }
          } catch (err) {
            console.warn('Failed to read pending username:', err)
          }

          if (pendingUsername && pendingUsername.trim().length > 0 && existingProfile.username !== pendingUsername) {
            try {
              const emailLocal = session.user.email?.split('@')[0] || ''
              const updatePayload: any = { username: pendingUsername.trim() }
              // If the display_name currently equals the email local part (auto-created),
              // set display_name to the pending username as a one-time assignment.
              if (!existingProfile.display_name || existingProfile.display_name === emailLocal) {
                updatePayload.display_name = pendingUsername.trim()
              }

              const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', session.user.id)
                .select('*')
                .single()

              if (updateError) {
                console.error('Failed to update profile username with pending username:', updateError)
                // Fallback to existing profile data
                profileData = existingProfile
                setProfile(profileData)
              } else {
                profileData = updatedProfile
                setProfile(profileData)
                try {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('clannect_pending_username')
                    localStorage.removeItem('clannect_pending_email')
                  }
                } catch (err) {
                  console.warn('Failed to remove pending username:', err)
                }
              }
            } catch (err) {
              console.error('Exception while applying pending username:', err)
              profileData = existingProfile
              setProfile(profileData)
            }
          } else {
            profileData = existingProfile
            setProfile(profileData)
          }
        } else {
          // Profile doesn't exist - create it on-demand using upsert
          console.log('Profile not found, creating on-demand...')

          // Prefer a username the user entered at signup (stored in localStorage),
          // otherwise fall back to the email local part.
          let desiredUsername = session.user.email?.split('@')[0] || 'user'
          try {
            if (typeof window !== 'undefined') {
              const pending = localStorage.getItem('clannect_pending_username')
              if (pending && pending.trim().length > 0) {
                desiredUsername = pending.trim()
              }
            }
          } catch (err) {
            console.warn('Failed to read pending username from localStorage:', err)
          }

          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              email: session.user.email || '',
              username: desiredUsername,
              // One-time: set display_name to the chosen username at signup
              display_name: desiredUsername,
              banner_gradient: 'from-blue-600 to-purple-600',
              created_at: new Date().toISOString(),
            }, { onConflict: 'id' })
            .select('*')
            .single()

          if (createError) {
            console.error('Error creating profile:', createError)
            // Continue anyway - user can use hub without profile
          } else if (newProfile) {
            profileData = newProfile
            setProfile(newProfile)
            // Clean up the pending username after successful creation
            try {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('clannect_pending_username')
                localStorage.removeItem('clannect_pending_email')
              }
            } catch (err) {
              console.warn('Failed to remove pending username:', err)
            }
          }
        }
        // Sync email confirmed flag from auth user into the profiles table if it's missing
        try {
          const authConfirmed = (session.user as any)?.email_confirmed_at || (session.user as any)?.confirmed_at || null
          if (authConfirmed && (!profileData || !profileData.email_confirmed_at)) {
            const { data: syncedProfile, error: syncError } = await supabase
              .from('profiles')
              .update({ email_confirmed_at: authConfirmed })
              .eq('id', session.user.id)
              .select('*')
              .single()

            if (!syncError && syncedProfile) {
              profileData = syncedProfile
              setProfile(profileData)
            }
          }
        } catch (syncErr) {
          console.warn('Failed to sync email confirmed flag:', syncErr)
        }

        // Fetch list of users blocked by current user so we can filter their posts
        const { data: blockedData } = await supabase
          .from('blocked_users')
          .select('blocked_id')
          .eq('blocker_id', session.user.id)

        const blockedSet = new Set<string>((blockedData || []).map((b: any) => b.blocked_id))
        setBlockedUserIds(blockedSet)
        
        // Fetch all posts ordered by created_at DESC (newest first)
        try {
          // Check if URL has a specific post ID to navigate to
          const urlMatch = window.location.pathname.match(/\/hub\/post\/([^\/]+)/)
          const urlPostId = urlMatch ? urlMatch[1] : null
          
          // If we have a URL post ID, set the navigation flag immediately
          if (urlPostId) {
            console.log('[Initial Load] URL has specific post ID:', urlPostId)
            isExplicitNavigationRef.current = true
          }
          
          // Fetch the 10 most recent posts
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .range(0, 9) // Initial load: 10 posts
          
          if (postsError) {
            console.error('Error fetching posts - Details:', postsError)
            setPosts([])
            setHasMorePosts(true)
          } else if (postsData) {
            let allPosts = [...postsData]
            
            // If URL has a post ID that's not in the initial posts, fetch it separately
            if (urlPostId && !postsData.some(p => p.id === urlPostId)) {
              console.log('[Initial Load] Fetching URL post separately:', urlPostId)
              const { data: urlPost, error: urlPostError } = await supabase
                .from('posts')
                .select('*')
                .eq('id', urlPostId)
                .single()
              
              if (!urlPostError && urlPost) {
                // Only add the URL post if its author is not blocked
                if (!blockedSet.has(urlPost.user_id)) {
                  allPosts = [urlPost, ...postsData]
                } else {
                  allPosts = [...postsData]
                }
                console.log('[Initial Load] Added URL post to posts array')
              } else {
                console.log('[Initial Load] URL post not found:', urlPostError)
              }
            }
            
            // Filter out posts from blocked users
            allPosts = allPosts.filter(p => !blockedSet.has(p.user_id))

            // Check if there are more posts
            setHasMorePosts(postsData.length >= 10)
            
            // Fetch profiles for all post authors
            const userIds = [...new Set(allPosts.map(post => post.user_id))]
            
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, equipped_frame')
              .in('id', userIds)
            
            if (profilesError) {
              console.error('Error fetching profiles:', profilesError)
              // Still display posts even if profiles fail
              setPosts(allPosts)
            } else {
              // Map profiles to posts
              const profilesMap = new Map()
              profilesData?.forEach(profile => {
                profilesMap.set(profile.id, profile)
              })
              
              const enrichedPosts = allPosts.map(post => ({
                ...post,
                profiles: profilesMap.get(post.user_id),
              }))
              
              setPosts(enrichedPosts)
              
              // Initialize likeStates with defaults and fetch actual stats
              const initialLikeStates: Record<string, { isLiked: boolean; count: number }> = {}
              enrichedPosts.forEach(post => {
                initialLikeStates[post.id] = { isLiked: false, count: 0 }
              })
              setLikeStates(initialLikeStates)
              
              // Initialize followStates by checking if current user follows each post author
              const initialFollowStates: Record<string, { isFollowing: boolean; isLoading: boolean }> = {}
              
              // Fetch following status for all post authors
              const { data: followingData, error: followingError } = await supabase
                .from('followers')
                .select('user_id')
                .eq('follower_user_id', session.user.id)
                .is('unfollowed_at', null)
              
              if (!followingError && followingData) {
                const followingSet = new Set(followingData.map(f => f.user_id))
                enrichedPosts.forEach(post => {
                  initialFollowStates[post.user_id] = {
                    isFollowing: followingSet.has(post.user_id),
                    isLoading: false
                  }
                })
              } else {
                // Default all to not following if there's an error
                enrichedPosts.forEach(post => {
                  initialFollowStates[post.user_id] = { isFollowing: false, isLoading: false }
                })
              }
              
              setFollowStates(initialFollowStates)
              
              // Initialize allyStates by checking if current user is allies with each post author
              const initialAllyStates: Record<string, boolean> = {}
              
              // Fetch ally status for all post authors
              const { data: alliesData, error: alliesError } = await supabase
                .from('allies')
                .select('user_id, ally_id')
              
              if (!alliesError && alliesData) {
                enrichedPosts.forEach(post => {
                  const isAlly = alliesData.some(ally => 
                    (ally.user_id === session.user.id && ally.ally_id === post.user_id) ||
                    (ally.ally_id === session.user.id && ally.user_id === post.user_id)
                  )
                  initialAllyStates[post.user_id] = isAlly
                })
              } else {
                // Default all to not allies if there's an error
                enrichedPosts.forEach(post => {
                  initialAllyStates[post.user_id] = false
                })
              }
              
              setAllyStates(initialAllyStates)
              
              // Fetch actual stats for all posts
              enrichedPosts.forEach(post => {
                fetchPostStats(post.id, session.user.id)
              })
            }
          }
        } catch (postsErr) {
          console.error('Exception while fetching posts:', postsErr)
          setPosts([])
        }
      } catch (err) {
        console.error('Unexpected auth error:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/check-admin')
        const data = await response.json()
        
        if (data.isAdmin) {
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      }
    }

    if (user) {
      checkAdminStatus()
    }
  }, [user])

  // Admin magic-link flow removed — clicking Admin Panel should go directly to admin site

  // Admin magic-link timers removed

  // verification modal removed

  // sendVerificationEmail removed — modal was deprecated

  // Track visible post by scroll position and update URL
  useEffect(() => {
    let attempts = 0
    const maxAttempts = 20
    
    const setupScrollListener = () => {
      attempts++
      const container = feedContainerRef.current
      
      if (!container) {
        console.log(`[Scroll Listener] Container ref is null (attempt ${attempts}/${maxAttempts})`)
        if (attempts < maxAttempts) {
          setTimeout(setupScrollListener, 100)
        } else {
          console.error('[Scroll Listener] Failed to attach to container after retries')
        }
        return
      }

      console.log('[Scroll Listener] Container ref found, attaching listener')

      const updateVisiblePost = (skipUrlUpdate: boolean = false) => {
        // Skip if we're in explicit navigation mode (user just clicked a shared post)
        if (isExplicitNavigationRef.current) {
          console.log('[Scroll Listener] Skipping updateVisiblePost during explicit navigation')
          return
        }

        const postElements = document.querySelectorAll('[data-post-id]')
        
        if (postElements.length === 0) {
          console.log('[Scroll Listener] No posts found')
          return
        }

        // Find post closest to the center of the container's visible area
        // Find post closest to the center of the container's visible area
        let closestPostElement: HTMLElement | null = null
        let closestDistance = Infinity

        // The center of the container's visible area in screen coordinates
        const containerRect = container.getBoundingClientRect()
        const containerVisibleCenterY = containerRect.top + containerRect.height / 2

        postElements.forEach((element) => {
          const rect = element.getBoundingClientRect()
          
          // Check if this element is at least partially visible in the container
          const elementTop = rect.top
          const elementBottom = rect.bottom
          const containerTop = containerRect.top
          const containerBottom = containerRect.bottom
          
          // Skip elements that are completely outside the visible area
          if (elementBottom < containerTop || elementTop > containerBottom) {
            return
          }

          // Distance from element center to container visible center
          const elementCenterY = rect.top + rect.height / 2
          const distance = Math.abs(elementCenterY - containerVisibleCenterY)

          if (distance < closestDistance) {
            closestDistance = distance
            closestPostElement = element as HTMLElement
          }
        })

        if (closestPostElement) {
          const postId = (closestPostElement as HTMLElement).getAttribute('data-post-id')
          
          if (postId) {
            // Only update URL if the post ID actually changed
            const currentUrl = window.location.pathname
            const newUrl = `/hub/post/${postId}`
            
            if (!skipUrlUpdate && currentUrl !== newUrl) {
              console.log('[Scroll Listener] URL changing from', currentUrl, 'to', newUrl)
              window.history.replaceState({}, '', newUrl)
            }
            setVisiblePostId(postId)
          }
        }

        // Check if scrolled near bottom and load more
        const scrollTop = container.scrollTop
        const scrollHeight = container.scrollHeight
        const clientHeight = container.clientHeight
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)

        // Load more when within 500px of bottom
        if (distanceFromBottom < 500 && !loadingMoreRef.current && hasMorePosts) {
          console.log('[Scroll Listener] Near bottom, loading more posts...')
          loadMorePosts()
        }
      }

      // Cooldown for both scroll and arrow keys to ensure URL updates properly
      let scrollTimeout: NodeJS.Timeout | null = null
      let keyCooldown = false
      let scrollCooldown = false
      const COOLDOWN_TIME = 400 // milliseconds
      
      const handleScroll = () => {
        // Ignore scroll events while cooldown is active
        if (scrollCooldown) {
          return
        }

        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }
        
        // Set scroll cooldown
        scrollCooldown = true
        setTimeout(() => {
          scrollCooldown = false
        }, COOLDOWN_TIME)
        
        // Wait for scroll to settle, then update URL
        scrollTimeout = setTimeout(() => {
          updateVisiblePost(false)
          scrollTimeout = null
        }, 200)
      }

      // Add cooldown to arrow keys to pace scrolling
      const handleKeyDown = (e: KeyboardEvent) => {
        if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
          if (keyCooldown) {
            e.preventDefault()
            return
          }
          
          // Set cooldown
          keyCooldown = true
          setTimeout(() => {
            keyCooldown = false
          }, COOLDOWN_TIME)
        }
      }

      container.addEventListener('scroll', handleScroll)
      document.addEventListener('keydown', handleKeyDown)
      // Check if user navigated with explicit post ID - if so, don't call updateVisiblePost on mount
      // Let the scroll-to-post effect handle displaying the correct post
      const currentPath = window.location.pathname
      const hasExplicitPostId = /\/hub\/post\/([^\/]+)/.test(currentPath)
      if (!hasExplicitPostId) {
        // Only update visible post on mount if no explicit post ID in URL
        updateVisiblePost(false)
      }

      console.log('[Scroll Listener] Attached to container successfully')

      return () => {
        container.removeEventListener('scroll', handleScroll)
        document.removeEventListener('keydown', handleKeyDown)
        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }
      }
    }

    return setupScrollListener()
  }, [feedContainerRef])

  // Fetch conversations when share mode is opened
  useEffect(() => {
    if (sharePostId) {
      fetchShareConversations()
    }
  }, [sharePostId])

  // Scroll to post when URL has /hub/post/[postId]
  useEffect(() => {
    if (!posts.length) return

    const match = pathname.match(/\/hub\/post\/([^\/]+)/)
    const urlPostId = match ? match[1] : null

    if (urlPostId) {
      console.log('[URL Navigation] Scrolling to post:', urlPostId, 'posts count:', posts.length)
      // Ensure flag is set to prevent scroll listener from interfering
      isExplicitNavigationRef.current = true
      
      // Wait longer for DOM to render the posts
      const attemptScroll = (attempt: number) => {
        const element = document.querySelector(`[data-post-id="${urlPostId}"]`)
        console.log('[URL Navigation] Attempt', attempt, 'Found element:', !!element)
        
        if (element && feedContainerRef.current) {
          console.log('[URL Navigation] Scrolling to element')
          element.scrollIntoView({ behavior: 'instant', block: 'center' })
          setVisiblePostId(urlPostId)
          // Clear flag after a delay
          setTimeout(() => {
            isExplicitNavigationRef.current = false
            console.log('[URL Navigation] Cleared navigation flag')
          }, 1000)
          return true
        }
        return false
      }
      
      // Try immediately
      if (attemptScroll(1)) return
      
      // Try after short delay
      setTimeout(() => {
        if (attemptScroll(2)) return
        
        // Try after longer delay
        setTimeout(() => {
          if (attemptScroll(3)) return
          
          // Final attempt after even longer
          setTimeout(() => {
            if (!attemptScroll(4)) {
              console.log('[URL Navigation] Post not found after 4 attempts, clearing flag')
              isExplicitNavigationRef.current = false
            }
          }, 300)
        }, 200)
      }, 100)
    }
  }, [posts.length, pathname])

  // Fetch allies for right sidebar
  useEffect(() => {
    const fetchAllies = async () => {
      if (!user) return
      
      try {
        setRightSidebarLoading(true)
        const { data: alliesData, error: alliesError } = await supabase
          .from('allies')
          .select('id, user_id, ally_id')
          .eq('user_id', user.id)
        
        if (alliesError) {
          console.error('Error fetching allies:', alliesError)
          setAllies([])
          return
        }

        if (!alliesData || alliesData.length === 0) {
          setAllies([])
          return
        }

        // Get ally profile data
        const allyIds = alliesData.map(ally => ally.ally_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', allyIds)
        
        if (profilesError) {
          console.error('Error fetching ally profiles:', profilesError)
          setAllies([])
          return
        }

        const profilesMap = new Map()
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile)
        })

        const enrichedAllies = alliesData.map(ally => ({
          ...ally,
          profile: profilesMap.get(ally.ally_id),
        }))

        setAllies(enrichedAllies)
      } catch (err) {
        console.error('Error fetching allies:', err)
        setAllies([])
      } finally {
        setRightSidebarLoading(false)
      }
    }

    if (user) {
      fetchAllies()
    }
  }, [user, supabase])

  // Fetch and subscribe to ally request count
  useEffect(() => {
    if (!user) return

    const fetchAllyRequestCount = async () => {
      try {
        const response = await fetch('/api/get-ally-request-count')
        if (response.ok) {
          const data = await response.json()
          setAllyRequestCount(data.count || 0)
        }
      } catch (err) {
        console.error('Error fetching ally request count:', err)
      }
    }

    // Fetch on load
    fetchAllyRequestCount()

    // Set up real-time subscription to ally_requests table
    const subscription = supabase
      .channel(`ally-requests-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ally_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          // Refetch count whenever ally requests change
          fetchAllyRequestCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [user, supabase])

  // Comment cooldown timer effect
  useEffect(() => {
    if (!commentCooldownActive || commentCooldownRemaining <= 0) return

    const interval = setInterval(() => {
      setCommentCooldownRemaining(prev => {
        const newValue = Math.max(0, prev - 1)
        if (newValue === 0) {
          setCommentCooldownActive(false)
        }
        return newValue
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [commentCooldownActive])

  // Check comment cooldown on load
  useEffect(() => {
    if (user) {
      checkCommentCooldown()
    }
  }, [user])

  // Close menu on outside click / scroll / resize
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (!openMenuPostId) return
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return
      setOpenMenuPostId(null)
      setMenuPosition(null)
    }

    const handleScrollOrResize = () => {
      if (openMenuPostId) {
        setOpenMenuPostId(null)
        setMenuPosition(null)
      }
    }

    document.addEventListener('mousedown', handleDocClick)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleDocClick)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [openMenuPostId])

  if (loading) {
    return <GlobalLoading />
  }

  return (
    <div className="min-h-screen bg-[#181818] text-white">
      {/* verification modal removed */}
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="hidden md:flex md:flex-col w-72 bg-[#1f1f1f] border-r border-gray-800 py-6 px-4">
          {/* Logo */}
          <button
            onClick={() => router.push('/hub')}
            className="px-2 mb-8 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Image
              src="/ClannectLogo.png"
              alt="Clannect"
              width={140}
              height={40}
              className="h-auto w-auto"
              priority
            />
          </button>
          
          {/* Profile Section */}
          {profile && (
            <div className="px-2 mb-8">
              <div className="flex items-start gap-3">
                <AvatarWithFrame
                  src={profile.avatar_url}
                  alt={profile.username}
                  equippedFrame={profile.equipped_frame}
                  size="lg"
                  frameScale={1.25}
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate text-sm">{profile.display_name || profile.username}</h3>
                  <p className="text-gray-500 text-xs truncate">@{profile.username}</p>
                </div>
                <div className="flex items-center gap-2 bg-[#252525] rounded-lg px-3 py-2 flex-shrink-0">
                  <img 
                    src="/Visuals/ClannectCoin.png"
                    alt="Cloin"
                    className="w-5 h-5 pointer-events-none select-none"
                    draggable={false}
                  />
                  <span className="text-white font-semibold text-sm">{profile.cloin || 0}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Divider */}
          <div className="h-px bg-gray-800 mx-2 mb-6"></div>
          
          {/* Navigation */}
          <div className="flex-1 px-2">
            <div className="space-y-1">
              {[
                { id: 'hub', label: 'Hub', icon: Home },
                { id: 'post', label: 'Post', icon: Plus },
                { id: 'shop', label: 'Shop', icon: ShoppingCart },
                ...(allyRequestCount > 0 ? [{ id: 'allies', label: 'Allies', icon: Users, badge: allyRequestCount }] : [{ id: 'allies', label: 'Allies', icon: Users }]),
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'collections', label: 'Collections', icon: Bookmark },
                { id: 'settings', label: 'Settings', icon: Settings },
                ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: BarChart }] : []),
              ].map((item: any) => {
                const Icon = item.icon
                const displayBadge = item.badge && item.badge > 0
                return (
                  <button
                    key={item.id}
                    ref={undefined}
                    onClick={async (e) => {
                      try { e?.preventDefault?.() } catch {}
                      console.log('[Admin Button] clicked, beginning token request')
                      // For admin button: navigate directly to admin verify page
                      if (['post', 'profile', 'allies', 'settings', 'shop', 'collections', 'admin'].includes(item.id)) {
                        if (item.id === 'admin') {
                            try {
                              // Request a short-lived signed token from the app server, then redirect
                              const res = await fetch('/api/create-admin-token', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } })
                              console.log('[Admin Button] create-admin-token response status', res.status)
                              const data = await res.json()
                              console.log('[Admin Button] create-admin-token response data', data)
                              if (res.ok && data?.token) {
                                const url = `https://admin.clannect.com/auth/admin-verify?t=${encodeURIComponent(data.token)}`
                                window.location.href = url
                              } else {
                                // fallback: open admin verify page without token
                                try { window.location.href = 'https://admin.clannect.com/auth/admin-verify' } catch (e) { router.push('https://admin.clannect.com/auth/admin-verify') }
                              }
                            } catch (e) {
                              // network/other error -> fallback to admin site
                              try { window.location.href = 'https://admin.clannect.com/auth/admin-verify' } catch (err) { router.push('https://admin.clannect.com/auth/admin-verify') }
                            }
                          } else {
                          router.push(`/${item.id}`)
                        }
                      } else if (item.id === 'hub') {
                        setActiveTab(item.id)
                      } else {
                        setActiveTab(item.id)
                      }
                    }}
                    disabled={false}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 relative ${
                      activeTab === item.id
                        ? 'bg-[#ff4234] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="flex items-center gap-2">
                      <span>{item.label}</span>
                    </span>
                    {displayBadge && (
                      <span className="ml-auto flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-fit">
                        {item.badge > 9 ? '+9' : item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Logout removed — moved to Settings → Account tab */}
        </div>

        {/* Admin debug overlay removed */}

        {/* Middle Feed */}
        <div ref={feedContainerRef} className="flex-1 bg-[#181818] border-r border-gray-800 overflow-y-auto snap-y snap-mandatory">
          <div className="min-h-screen flex flex-col">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
                <p className="text-gray-400 text-lg">No posts yet</p>
                <p className="text-gray-500 text-sm mt-2">Be the first to share something with your clan!</p>
                <button
                  onClick={() => router.push('/post')}
                  className="mt-6 bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
                >
                  Create Post
                </button>
              </div>
            ) : (
              posts.map((post) => {
                const postDate = new Date(post.created_at)
                const formattedDate = postDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
                
                const authorUsername = post.profiles?.username || 'Unknown User'

                return (
                  <div
                    key={post.id}
                    data-post-id={post.id}
                    ref={(el) => {
                      if (el) {
                        postRefs.current.set(post.id, el)
                      } else {
                        postRefs.current.delete(post.id)
                      }
                    }}
                    className="min-h-screen w-full flex items-center justify-center p-4 snap-center"
                  >
                    {/* Post Container with Comments Sidebar */}
                    <div className="relative w-full max-w-2xl h-full max-h-screen flex">
                      {/* Main Post */}
                      <div className="bg-[#1f1f1f] rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors w-full cursor-pointer flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      {/* Post Header */}
                      <div className="p-5">
                        <div 
                          className="flex items-start gap-3 mb-4 cursor-pointer relative"
                          onMouseEnter={() => setHoveredPostId(post.id)}
                          onMouseLeave={() => setHoveredPostId(null)}
                          onClick={() => {
                            if (post.user_id === user.id) {
                              router.push('/profile')
                            } else {
                              router.push(`/profile/${post.profiles?.username}`)
                            }
                          }}
                        >
                        <AvatarWithFrame
                          src={post.profiles?.avatar_url}
                          alt={authorUsername}
                          equippedFrame={post.profiles?.equipped_frame}
                          size="md"
                          frameScale={1.25}
                          className={`flex-shrink-0 transition-opacity ${
                            hoveredPostId === post.id ? 'opacity-60' : 'opacity-100'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-white font-semibold text-sm transition-all ${
                              hoveredPostId === post.id ? 'border-b-2 border-[#ff4234] inline-block pb-0.5' : ''
                            }`}>{post.profiles?.display_name || authorUsername}</h4>
                            {allyStates[post.user_id] && post.user_id !== user?.id && (
                              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Ally</span>
                            )}
                            {followStates[post.user_id]?.isFollowing && post.user_id !== user?.id && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Following</span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs">@{authorUsername} · {formattedDate}</p>
                        </div>
                        
                        {/* Follow Button - Show if viewing someone else's post */}
                        {post.user_id !== user?.id && hoveredPostId === post.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFollow(post.user_id)
                            }}
                            disabled={followStates[post.user_id]?.isLoading}
                            className={`ml-2 flex-shrink-0 px-3 py-1 rounded-lg transition-colors text-xs font-medium ${
                              followStates[post.user_id]?.isFollowing
                                ? 'bg-gray-700 hover:bg-red-600 text-white'
                                : 'bg-[#ff4234] hover:bg-red-600 text-white'
                            } ${followStates[post.user_id]?.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {followStates[post.user_id]?.isLoading ? 'Loading...' : followStates[post.user_id]?.isFollowing ? 'Unfollow' : 'Follow'}
                          </button>
                        )}

                        {/* Three dots menu (appears to the right of Follow) */}
                        {hoveredPostId === post.id && (
                          <div className="relative ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                setMenuPosition({ top: rect.bottom + window.scrollY, left: Math.max(8, rect.right + window.scrollX - 200) })
                                setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)
                              }}
                              className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                            >
                              <MoreVertical size={20} />
                            </button>
                          </div>
                        )}
                        
                        
                      </div>

                      {/* Post Title */}
                      <h3 className="text-white font-bold text-lg mb-2">{post.title}</h3>

                      {/* Post Description */}
                      {post.description && (
                        <p className="text-gray-300 text-sm mb-4 whitespace-pre-wrap">{post.description}</p>
                      )}
                    </div>

                    {/* Media */}
                    {post.media_url && (
                      <div className="relative w-full bg-[#252525] max-h-96 overflow-hidden">
                        {post.media_url.includes('.mp4') ||
                        post.media_url.includes('.webm') ||
                        post.media_url.includes('video') ? (
                          <div className="relative z-0 overflow-hidden">
                            <video
                              src={post.media_url}
                              loop
                              muted
                              playsInline
                              className="w-full h-auto object-cover hover:opacity-80 transition-opacity relative z-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                const v = e.currentTarget as HTMLVideoElement
                                try {
                                  if (v.paused) {
                                    const p = v.play()
                                    if (p && typeof p.then === 'function') p.catch(() => {})
                                  } else {
                                    v.pause()
                                  }
                                } catch (err) {}
                              }}
                              onDoubleClick={(e) => {
                                // prevent browser native fullscreen on double click
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                            />

                            {/* Mute/Unmute button bottom-right of video (always visible above video controls) */}
                            <div className="absolute bottom-3 right-3 z-50 pointer-events-auto">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const newVal = !audioEnabled
                                  try { localStorage.setItem('clannectAudioEnabled', newVal ? 'true' : 'false') } catch (err) {}
                                  setAudioEnabled(newVal)
                                  // If enabling audio, unmute/play the visible post only
                                  if (newVal && visiblePostId === post.id) {
                                    const el = postRefs.current.get(post.id)
                                    if (el) {
                                      const videos = Array.from(el.querySelectorAll('video')) as HTMLVideoElement[]
                                      videos.forEach((v) => {
                                        try { v.muted = false; const p = v.play(); if (p && typeof p.then === 'function') p.catch(() => {}) } catch (err) {}
                                      })
                                    }
                                  }
                                  // If disabling, mute all videos
                                  if (!newVal) {
                                    postRefs.current.forEach((el) => {
                                      try {
                                        const videos = Array.from(el.querySelectorAll('video')) as HTMLVideoElement[]
                                        videos.forEach((v) => { try { v.muted = true } catch (err) {} })
                                      } catch (err) {}
                                    })
                                  }
                                }}
                                className="bg-black/70 text-white p-2 rounded-lg flex items-center justify-center"
                                title={audioEnabled ? 'Mute' : 'Unmute'}
                                aria-label={audioEnabled ? 'Mute video' : 'Unmute video'}
                              >
                                {audioEnabled ? <Volume size={18} /> : <VolumeX size={18} />}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={post.media_url}
                            alt="Post media"
                            className="w-full h-auto object-cover hover:opacity-80 transition-opacity"
                          />
                        )}
                                      {/* Global audio enable banner/button */}
                                      {!audioEnabled && (
                                        <div className="absolute top-3 left-3 z-40">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              try { localStorage.setItem('clannectAudioEnabled', 'true') } catch (err) {}
                                              setAudioEnabled(true)
                                              // Unmute visible post videos immediately
                                              const el = postRefs.current.get(post.id)
                                              if (el) {
                                                const videos = Array.from(el.querySelectorAll('video')) as HTMLVideoElement[]
                                                videos.forEach((v) => {
                                                  try { v.muted = false; const p = v.play(); if (p && typeof p.then === 'function') p.catch(() => {}) } catch (err) {}
                                                })
                                              }
                                            }}
                                            className="bg-black/60 text-white text-sm px-3 py-1 rounded-lg"
                                          >
                                            Enable audio
                                          </button>
                                        </div>
                                      )}
                                      {/* Global click-to-unmute prompt shown when autoplay-with-sound is blocked */}
                                      {showGlobalClickPrompt && (
                                        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pointer-events-none">
                                          <div className="pointer-events-auto bg-black/70 text-white px-4 py-2 rounded-lg">Click anywhere to enable audio</div>
                                        </div>
                                      )}
                      </div>
                    )}

                    {/* Engagement Section - Likes and Comments */}
                    <div className="px-5 py-3 border-t border-gray-800">
                      {/* Likes and Comments Counts */}
                      <div className="flex gap-4 text-xs text-gray-500 mb-3">
                        {likeStates[post.id]?.count > 0 && (
                          <button
                            onClick={() => {
                              setLikesModalPostId(post.id)
                              setLikesModalOpen(true)
                              setLikesModalSearchQuery('')
                              fetchUsersWhoLiked(post.id)
                            }}
                            className="hover:underline cursor-pointer hover:text-gray-400 transition-colors"
                          >
                            {likeStates[post.id].count} {likeStates[post.id].count === 1 ? 'like' : 'likes'}
                          </button>
                        )}
                        {commentCounts[post.id] > 0 && (
                          <span className="hover:underline cursor-pointer" onClick={() => {
                            setExpandedCommentsPostId(expandedCommentsPostId === post.id ? null : post.id)
                            if (expandedCommentsPostId !== post.id) {
                              fetchPostComments(post.id)
                            }
                          }}>
                            {commentCounts[post.id]} {commentCounts[post.id] === 1 ? 'comment' : 'comments'}
                          </span>
                        )}
                      </div>

                      {/* Like and Comment Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => toggleLike(post.id)}
                          disabled={post.user_id === user?.id}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium ${
                            post.user_id === user?.id
                              ? 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
                              : likeStates[post.id]?.isLiked
                              ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
                          }`}
                          title={post.user_id === user?.id ? 'You cannot like your own post' : ''}
                        >
                          <Heart
                            size={18}
                            className={likeStates[post.id]?.isLiked ? 'fill-current' : ''}
                          />
                          {post.user_id === user?.id ? 'Your Post' : 'Like'}
                        </button>
                        <button
                          onClick={() => {
                            setExpandedCommentsPostId(expandedCommentsPostId === post.id ? null : post.id)
                            if (expandedCommentsPostId !== post.id) {
                              fetchPostComments(post.id)
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium text-gray-400 hover:text-blue-500 hover:bg-blue-500/10"
                        >
                          <MessageCircle size={18} />
                          Comment
                        </button>
                        <button
                          onClick={() => {
                            setSharePostId(sharePostId === post.id ? null : post.id)
                            setShareSearchQuery('')
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium text-gray-400 hover:text-green-500 hover:bg-green-500/10"
                          title="Share post"
                        >
                          <Send size={18} />
                          Share
                        </button>
                      </div>
                    </div>
                      </div>

                      {/* Right Sidebar - Comments or Share Panel */}
                      <div className={`
                        fixed right-0 top-0 h-full w-96 bg-[#1f1f1f] border-l border-gray-800 transform transition-transform duration-300 ease-in-out z-40
                        ${(expandedCommentsPostId === post.id || sharePostId === post.id) ? 'translate-x-0' : 'translate-x-full'}
                        overflow-y-auto flex flex-col
                      `}>
                        {/* Comments Mode */}
                        {expandedCommentsPostId === post.id && (
                          <>
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
                              <h3 className="text-white font-bold">Comments</h3>
                              <button
                                onClick={() => setExpandedCommentsPostId(null)}
                                className="p-1 hover:bg-gray-800 rounded transition-colors"
                                title="Close comments"
                              >
                                <X size={20} />
                              </button>
                            </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                          {loadingComments[post.id] ? (
                            <div className="text-center text-gray-400 text-sm py-4">Loading comments...</div>
                          ) : (postComments[post.id] || []).length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-4">No comments yet</div>
                          ) : (
                            <div className="space-y-4">
                              {postComments[post.id]?.map(comment => (
                                <div key={comment.id} className="flex gap-3 pb-4 border-b border-gray-800 last:border-b-0">
                                  {/* Profile Section - Clickable */}
                                  <div
                                    onClick={() => {
                                      if (comment.user_id === user?.id) {
                                        router.push('/profile')
                                      } else {
                                        router.push(`/profile/${comment.profiles?.username}`)
                                      }
                                    }}
                                    className="flex items-start gap-2 cursor-pointer hover:bg-gray-800/30 p-1 rounded transition-colors user-select-none flex-shrink-0"
                                    role="button"
                                    tabIndex={0}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        if (comment.user_id === user?.id) {
                                          router.push('/profile')
                                        } else {
                                          router.push(`/profile/${comment.profiles?.username}`)
                                        }
                                      }
                                    }}
                                    title={`Go to ${comment.profiles?.display_name || comment.profiles?.username}'s profile`}
                                  >
                                    <AvatarWithFrame
                                      src={comment.profiles?.avatar_url}
                                      alt={comment.profiles?.username}
                                      equippedFrame={comment.profiles?.equipped_frame}
                                      size="sm"
                                      frameScale={1.25}
                                      className="flex-shrink-0 hover:opacity-70 transition-opacity"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-white text-sm font-semibold hover:text-red-500 transition-colors cursor-pointer">
                                        {comment.profiles?.display_name || comment.profiles?.username}
                                      </span>
                                      <span className="text-gray-500 text-xs">@{comment.profiles?.username}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm break-words mb-2">{comment.content}</p>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-gray-600 text-xs">
                                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => toggleCommentLike(comment.id)}
                                          className={`flex items-center gap-1 text-xs transition-colors ${
                                            commentLikeStates[comment.id]?.isLiked
                                              ? 'text-red-500 hover:text-red-400'
                                              : 'text-gray-500 hover:text-red-500'
                                          }`}
                                        >
                                          <Heart
                                            size={14}
                                            className={commentLikeStates[comment.id]?.isLiked ? 'fill-current' : ''}
                                          />
                                          {commentLikeStates[comment.id]?.count > 0 && (
                                            <span>{commentLikeStates[comment.id].count}</span>
                                          )}
                                        </button>
                                        {comment.user_id === user?.id && (
                                          <button
                                            onClick={() => deleteComment(comment.id, post.id)}
                                            className="text-red-500 hover:text-red-400 transition-colors"
                                            title="Delete comment"
                                          >
                                            <X size={14} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Load More Comments Button */}
                        {(commentsLoadedCount[post.id] || 0) < (totalCommentsCount[post.id] || 0) && (
                          <div className="px-5 py-3 text-center border-t border-gray-800 flex-shrink-0">
                            <button
                              onClick={() => fetchPostComments(post.id, true)}
                              disabled={loadingComments[post.id]}
                              className="text-blue-500 hover:text-blue-400 text-sm font-medium disabled:opacity-50"
                            >
                              {loadingComments[post.id] ? 'Loading...' : `Load more (${(totalCommentsCount[post.id] || 0) - (commentsLoadedCount[post.id] || 0)})`}
                            </button>
                          </div>
                        )}

                        {/* Comment Input */}
                        <div className="px-5 py-4 border-t border-gray-800 bg-[#252525]/50 flex-shrink-0">
                          <div className="flex gap-3 mb-3">
                            <AvatarWithFrame
                              src={profile?.avatar_url}
                              alt={profile.username}
                              equippedFrame={profile?.equipped_frame}
                              size="sm"
                              frameScale={1.25}
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 flex gap-2">
                              <textarea
                                placeholder="Add a comment..."
                                value={newCommentText[post.id] || ''}
                                onChange={(e) => {
                                  const text = e.target.value.slice(0, 1000)
                                  setNewCommentText(prev => ({ ...prev, [post.id]: text }))
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    addComment(post.id, newCommentText[post.id])
                                  }
                                }}
                                rows={1}
                                className="flex-1 bg-[#1f1f1f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                              />
                              <button
                                onClick={() => addComment(post.id, newCommentText[post.id])}
                                disabled={!newCommentText[post.id]?.trim() || (newCommentText[post.id]?.length || 0) > 1000 || (submittingComments[post.id] || false)}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                              >
                                {submittingComments[post.id] ? '...' : 'Post'}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-end text-xs text-gray-500 px-11 mb-2">
                            {newCommentText[post.id]?.length || 0} / 1000
                          </div>
                          {commentCooldownActive && (
                            <div className="text-xs text-orange-400 mt-1">
                              ⚠️ Comment limit (5 per 20 min). No XP for {Math.floor(commentCooldownRemaining / 60)}m {commentCooldownRemaining % 60}s.
                            </div>
                          )}
                          {commentsInWindow >= XP_CONFIG.cooldowns.commentMax && !commentCooldownActive && (
                            <div className="text-xs text-yellow-400 mt-1">
                              ⚠️ Next comment won't earn XP.
                            </div>
                          )}
                        </div>
                          </>
                        )}

                        {/* Share Mode */}
                        {sharePostId === post.id && (
                          <>
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
                              <h3 className="text-white font-bold">Share Post</h3>
                              <button
                                onClick={() => setSharePostId(null)}
                                className="p-1 hover:bg-gray-800 rounded transition-colors"
                                title="Close share"
                              >
                                <X size={20} />
                              </button>
                            </div>

                            {/* Search */}
                            <div className="p-5 border-b border-gray-800 flex-shrink-0">
                              <input
                                type="text"
                                placeholder="Search people..."
                                value={shareSearchQuery}
                                onChange={(e) => setShareSearchQuery(e.target.value)}
                                className="w-full bg-[#252525] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            {/* People List */}
                            <div className="flex-1 overflow-y-auto px-5 py-4">
                              {isLoadingShareConversations ? (
                                <div className="text-center text-gray-400 text-sm py-4">Loading conversations...</div>
                              ) : shareConversations.length === 0 ? (
                                <div className="text-center text-gray-500 text-sm py-4">No conversations yet</div>
                              ) : (
                                <div className="space-y-3">
                                  {shareConversations
                                    .filter(conv => {
                                      const profile = conv.profile
                                      if (!profile) return false
                                      const searchLower = shareSearchQuery.toLowerCase()
                                      return (
                                        profile.username?.toLowerCase().includes(searchLower) ||
                                        profile.display_name?.toLowerCase().includes(searchLower)
                                      )
                                    })
                                    .map(conv => {
                                      const profile = conv.profile
                                      const canMessage = conversationDMPermissions[conv.id]
                                      const isSelected = selectedShareRecipients.has(conv.id)
                                      
                                      return (
                                        <div
                                          key={conv.conversation_id}
                                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                                            canMessage
                                              ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                                              : 'border-gray-800 opacity-60 cursor-not-allowed'
                                          }`}
                                          onClick={() => {
                                            if (!canMessage) return
                                            const newSelected = new Set(selectedShareRecipients)
                                            if (newSelected.has(conv.conversation_id)) {
                                              newSelected.delete(conv.conversation_id)
                                            } else {
                                              newSelected.add(conv.conversation_id)
                                            }
                                            setSelectedShareRecipients(newSelected)
                                          }}
                                        >
                                          {/* Checkbox */}
                                          <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                            canMessage
                                              ? isSelected
                                                ? 'bg-red-500 border-red-500'
                                                : 'border-gray-600 hover:border-gray-500'
                                              : 'border-gray-700 bg-transparent'
                                          }`}>
                                            {isSelected && canMessage && (
                                              <div className="text-white text-xs font-bold">✓</div>
                                            )}
                                          </div>

                                          {/* Avatar */}
                                          <AvatarWithFrame
                                            src={profile?.avatar_url}
                                            alt={profile.username}
                                            equippedFrame={profile?.equipped_frame}
                                            size="sm"
                                            frameScale={1.25}
                                            className="flex-shrink-0"
                                          />

                                          {/* User Info */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-white text-sm font-semibold truncate">
                                                {profile?.display_name || profile?.username}
                                              </span>
                                              {!canMessage && (
                                                <span className="text-gray-500 text-xs flex-shrink-0">🔒 Can't DM</span>
                                              )}
                                            </div>
                                            <span className="text-gray-500 text-xs truncate">@{profile?.username}</span>
                                          </div>
                                        </div>
                                      )
                                    })}
                                </div>
                              )}
                            </div>

                            {/* Send Button */}
                            {shareConversations.length > 0 && (
                              <div className="px-5 py-4 border-t border-gray-800 bg-[#252525]/50 flex-shrink-0">
                                <button
                                  onClick={handleSharePost}
                                  disabled={selectedShareRecipients.size === 0 || isLoadingShareConversations}
                                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                                >
                                  {isLoadingShareConversations ? 'Sharing...' : `Send to ${selectedShareRecipients.size} ${selectedShareRecipients.size === 1 ? 'person' : 'people'}`}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Backdrop - Click to close */}
                      {(expandedCommentsPostId === post.id || sharePostId === post.id) && (
                        <div
                          className="fixed inset-0 bg-black/30 z-30"
                          onClick={() => {
                            setExpandedCommentsPostId(null)
                            setSharePostId(null)
                          }}
                        />
                      )}
                      {/* Unmute overlay shown when autoplay with sound was blocked */}
                      {/* per-post unmute removed; global one-click handler will be used instead */}
                    </div>
                  </div>
                )
              })
            )}

            {/* Admin magic-link flow removed — no toast shown */}
          </div>
        </div>

        {/* Right Sidebar - Allies */}
        <RightSidebar allies={allies} />

        {/* Global fixed-position dropdown for post options */}
        {openMenuPostId && menuPosition && (
          <div ref={menuRef} style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, width: 200 }} className="z-50">
            <div className="bg-[#252525] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
              {/* Owner or viewer options depending on ownership */}
              {(() => {
                const p = posts.find(p => p.id === openMenuPostId)
                if (!p) return null
                if (p.user_id === user?.id) {
                  return (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleCopyLink(openMenuPostId) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                        <Link size={18} />
                        <span>{copiedLinkPostId === openMenuPostId ? 'Copied!' : 'Copy Link'}</span>
                      </button>

                      {/* Pin button - disabled if user already has a different pinned post */}
                      <button
                        onClick={async (e) => { e.stopPropagation(); if (!(Array.isArray(profile?.pinned_posts) && !profile.pinned_posts.includes(openMenuPostId) && profile.pinned_posts.length >= 1)) await togglePin(openMenuPostId) }}
                        disabled={Array.isArray(profile?.pinned_posts) && !profile.pinned_posts.includes(openMenuPostId) && profile.pinned_posts.length >= 1}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-gray-300 text-left ${Array.isArray(profile?.pinned_posts) && !profile.pinned_posts.includes(openMenuPostId) && profile.pinned_posts.length >= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a2a2a]'}`}
                      >
                        <Pin size={18} />
                        <span>{profile?.pinned_posts && profile.pinned_posts.includes(openMenuPostId) ? 'Unpin from My Profile' : 'Pin to My Profile'}</span>
                      </button>

                      <button onClick={(e) => e.stopPropagation()} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                        <BarChart size={18} />
                        <span onClick={(e) => { e.stopPropagation(); openStatsModal(openMenuPostId) }}>View Stats</span>
                      </button>

                      <div className="border-t border-gray-700"></div>

                      <button onClick={(e) => { e.stopPropagation(); const target = posts.find(pp => pp.id === openMenuPostId); setPostToDelete(target || null); setDeleteModalOpen(true); setOpenMenuPostId(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] text-left">
                        <Trash2 size={18} />
                        <span>Delete Post</span>
                      </button>
                    </>
                  )
                }

                return (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); handleCopyLink(openMenuPostId) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                      <Link size={18} />
                      <span>{copiedLinkPostId === openMenuPostId ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    {(() => {
                      // check if post is already saved in any collection
                      const savedIn = collections.find((c) => Array.isArray(c.saved_posts) && c.saved_posts.includes(openMenuPostId || ''))
                      if (savedIn) {
                        return (
                          <button onClick={(e) => { e.stopPropagation(); removePostFromCollection(savedIn.collection_id, openMenuPostId!) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                            <Bookmark size={18} />
                            <span>Remove from Collection</span>
                          </button>
                        )
                      }

                      return (
                        <button onClick={(e) => { e.stopPropagation(); openSaveModal(openMenuPostId!) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                          <Bookmark size={18} />
                          <span>Save to Collection</span>
                        </button>
                      )
                    })()}

                    <div className="border-t border-gray-700"></div>

                    <button onClick={(e) => { e.stopPropagation(); setBlockTarget({ id: p.user_id, displayName: '' }); setShowBlockConfirmation(true); setOpenMenuPostId(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] text-left">
                      <Ban size={18} />
                      <span>Block User</span>
                    </button>

                    <button onClick={(e) => e.stopPropagation()} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] text-left">
                      <X size={18} />
                      <span>Report Post</span>
                    </button>
                  </>
                )
              })()}
            </div>
          </div>
        )}
      {/* Save to Collection Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSaveModalOpen(false)} />
          <div className="bg-[#1f1f1f] rounded-lg p-6 z-10 w-full max-w-md text-center shadow-lg">
            <div className="flex items-center justify-center mb-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#ff4234]/20">
                <Folder size={20} className="text-[#ff4234]" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Save Post to Collection</h3>
            <p className="text-gray-400 mb-4">Choose a collection to save this post into.</p>

            <div className="max-h-64 overflow-y-auto mb-4">
              {collectionsLoading ? (
                <p className="text-gray-400">Loading...</p>
              ) : collections.length === 0 ? (
                <p className="text-gray-400">You don't have any collections.</p>
              ) : (
                <div className="space-y-2">
                  {collections.map((c) => {
                    const isSelected = selectedCollectionId === c.collection_id
                    return (
                      <div key={c.collection_id} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#171717] cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedCollectionId(isSelected ? null : c.collection_id) }} role="radio" aria-checked={isSelected}>
                        <div className={`flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#fb2c36] border-[#fb2c36]' : 'border-gray-600 hover:border-gray-500'}`}>
                          {isSelected && (
                            <div className="text-white text-xs font-bold">✓</div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">{c.collection_name}</span>
                            <span className="text-xs text-gray-400">{(c.saved_posts && Array.isArray(c.saved_posts)) ? c.saved_posts.length : 0} items</span>
                          </div>
                          <p className="text-gray-400 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setSaveModalOpen(false)} className="px-4 py-2 rounded-lg bg-transparent border border-gray-700 text-gray-200">Cancel</button>
              <button
                disabled={!selectedCollectionId || savingCollection || collections.length === 0}
                onClick={() => savePostToCollection(selectedCollectionId!)}
                className={`${!selectedCollectionId || savingCollection || collections.length === 0 ? 'bg-gray-700 text-gray-300 cursor-not-allowed' : 'bg-[#ff4234] text-white'} px-4 py-2 rounded-lg font-semibold`}
              >
                {savingCollection ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Stats Modal */}
        {statsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl max-w-md w-full mx-4 border border-gray-800 flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Post Stats</h2>
                <button
                  onClick={() => {
                    setStatsModalOpen(false)
                    setStatsModalPostId(null)
                    setStatsUsersWhoLiked([])
                    setStatsUsersWhoCommented([])
                    setStatsSearchQuery('')
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="px-6 py-4 border-b border-gray-800">
                <div className="text-sm text-gray-400 mb-3">Likes: {statsLikesCount} · Comments: {statsCommentsCount}</div>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={statsSearchQuery}
                  onChange={(e) => setStatsSearchQuery(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="overflow-y-auto flex-1">
                {statsLoading ? (
                  <div className="p-6 text-center text-gray-400">Loading...</div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    <div className="p-4">
                      <h3 className="text-gray-300 font-semibold mb-3">Users who liked this</h3>
                      {statsUsersWhoLiked.length === 0 ? (
                        <div className="text-gray-500">No likes yet</div>
                      ) : (
                        <div className="divide-y divide-gray-800">
                          {statsUsersWhoLiked
                            .filter((u: any) => {
                              const q = statsSearchQuery.toLowerCase()
                              return (
                                u.username.toLowerCase().includes(q) ||
                                (u.display_name && u.display_name.toLowerCase().includes(q))
                              )
                            })
                            .map((u: any) => (
                              <div
                                key={u.id}
                                className="p-3 flex items-center gap-3 hover:bg-[#252525] transition-colors cursor-pointer"
                                onClick={() => {
                                  if (u.id === user?.id) router.push('/profile')
                                  else router.push(`/profile/${u.username}`)
                                  setStatsModalOpen(false)
                                }}
                              >
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt={u.username} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-700" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300">{u.display_name ? u.display_name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}</div>
                                )}
                                <div className="flex-1">
                                  <div className="text-white font-medium">{u.display_name || u.username}</div>
                                  <div className="text-gray-400 text-sm">@{u.username}</div>
                                </div>
                              </div>
                            ))}
                          {statsLikedHasMore && (
                            <div className="p-3 text-center">
                              <button
                                onClick={() => {
                                  if (!statsModalPostId) return
                                  fetchStatsLikedPage(statsModalPostId, statsLikedOffset + 10)
                                }}
                                disabled={statsLikedLoadingMore}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                              >
                                {statsLikedLoadingMore ? 'Loading...' : 'Load more...'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="text-gray-300 font-semibold mb-3">Users who commented</h3>
                      {statsUsersWhoCommented.length === 0 ? (
                        <div className="text-gray-500">No comments yet</div>
                      ) : (
                        <div className="divide-y divide-gray-800">
                          {statsUsersWhoCommented
                            .filter((u: any) => {
                              const q = statsSearchQuery.toLowerCase()
                              return (
                                u.username.toLowerCase().includes(q) ||
                                (u.display_name && u.display_name.toLowerCase().includes(q))
                              )
                            })
                            .map((u: any) => (
                              <div
                                key={u.id}
                                className="p-3 flex items-center gap-3 hover:bg-[#252525] transition-colors cursor-pointer"
                                onClick={() => {
                                  if (u.id === user?.id) router.push('/profile')
                                  else router.push(`/profile/${u.username}`)
                                  setStatsModalOpen(false)
                                }}
                              >
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt={u.username} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-700" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300">{u.display_name ? u.display_name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}</div>
                                )}
                                <div className="flex-1">
                                  <div className="text-white font-medium">{u.display_name || u.username}</div>
                                  <div className="text-gray-400 text-sm">@{u.username}</div>
                                </div>
                              </div>
                            ))}
                          {statsCommentedHasMore && (
                            <div className="p-3 text-center">
                              <button
                                onClick={() => {
                                  if (!statsModalPostId) return
                                  fetchStatsCommentedPage(statsModalPostId, statsCommentedOffset + 10)
                                }}
                                disabled={statsCommentedLoadingMore}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                              >
                                {statsCommentedLoadingMore ? 'Loading...' : 'Load more...'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteModalOpen && postToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl p-6 max-w-sm w-full mx-4 border border-gray-800">
              <h2 className="text-white font-bold text-lg mb-2">Delete Post?</h2>
              <p className="text-gray-400 text-sm mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setPostToDelete(null)
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePost(postToDelete.id)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block Confirmation Modal */}
        {showBlockConfirmation && blockTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#252525] border border-gray-700 rounded-lg p-6 max-w-sm mx-4 shadow-xl">
              <h2 className="text-white font-semibold text-lg mb-3">Block User?</h2>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to block <span className="font-semibold text-white">{blockTarget.displayName}</span>? You won't be able to see each other's content.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowBlockConfirmation(false)}
                  disabled={isBlockingUser}
                  className="px-4 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] text-gray-300 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBlockUser()}
                  disabled={isBlockingUser}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Ban size={16} />
                  {isBlockingUser ? 'Blocking...' : 'Block'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Likes Modal */}
        {likesModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl max-w-sm w-full mx-4 border border-gray-800 flex flex-col max-h-96">
              {/* Header */}
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">People who liked this</h2>
                <button
                  onClick={() => {
                    setLikesModalOpen(false)
                    setLikesModalPostId(null)
                    setUsersWhoLiked([])
                    setLikesModalSearchQuery('')
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-4 border-b border-gray-800">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={likesModalSearchQuery}
                  onChange={(e) => setLikesModalSearchQuery(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Users List */}
              <div className="overflow-y-auto flex-1">
                {likesModalLoading ? (
                  <div className="p-6 text-center text-gray-400">
                    <span>Loading...</span>
                  </div>
                ) : usersWhoLiked.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <span>No one has liked this post yet</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {usersWhoLiked
                      .filter(userProfile => {
                        const searchLower = likesModalSearchQuery.toLowerCase()
                        return (
                          userProfile.username.toLowerCase().includes(searchLower) ||
                          (userProfile.display_name && userProfile.display_name.toLowerCase().includes(searchLower))
                        )
                      })
                      .map(userProfile => (
                        <div
                          key={userProfile.id}
                          className="p-4 flex items-center gap-3 hover:bg-[#252525] transition-colors cursor-pointer"
                          onClick={() => {
                            if (userProfile.id === user?.id) {
                              router.push('/profile')
                            } else {
                              router.push(`/profile/${userProfile.username}`)
                            }
                            setLikesModalOpen(false)
                          }}
                        >
                          {userProfile.avatar_url ? (
                            <img
                              src={userProfile.avatar_url}
                              alt={userProfile.username}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0 border border-gray-700">
                              <span className="text-xs font-bold text-white">?</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-sm">
                              {userProfile.display_name || userProfile.username}
                            </h4>
                            <p className="text-gray-500 text-xs">@{userProfile.username}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Media Modal */}
        {fullscreenMedia && (
          <div 
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 cursor-pointer"
            onClick={() => setFullscreenMedia(null)}
          >
            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {fullscreenMedia.includes('.mp4') ||
              fullscreenMedia.includes('.webm') ||
              fullscreenMedia.includes('video') ? (
                <video
                  src={fullscreenMedia}
                  controls
                  autoPlay
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              ) : (
                <img
                  src={fullscreenMedia}
                  alt="Fullscreen media"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              )}
              <button
                onClick={() => setFullscreenMedia(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/50 hover:bg-black/70 rounded-lg p-2"
                title="Close (or click anywhere)"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Level Up Modal -- FIXED FOR ADMINS TOO */}
        <LevelUpModal
          isOpen={levelUpModalOpen}
          newLevel={newLevelValue}
          cloinReward={levelUpCloinReward}
          onClose={() => setLevelUpModalOpen(false)}
        />
      </div>
    </div>
  )
}
