'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Home, Plus, Users, User, Settings, LogOut, Bookmark, Folder, X, MoreVertical, Pin, Trash2, Edit2 } from 'lucide-react'
import PostCard from '../components/PostCard'
import RightSidebar from '../components/RightSidebar'
import AvatarWithFrame from '../components/AvatarWithFrame'

export default function CollectionsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSidebarTab, setActiveSidebarTab] = useState('collections')
  const [allies, setAllies] = useState<any[]>([])
  const [rightSidebarLoading, setRightSidebarLoading] = useState(true)
  const [allyRequestCount, setAllyRequestCount] = useState(0)
  const [collections, setCollections] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewedCollection, setViewedCollection] = useState<any | null>(null)
  const [viewedPosts, setViewedPosts] = useState<any[]>([])
  const [openCollectionMenuId, setOpenCollectionMenuId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [collectionToDelete, setCollectionToDelete] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<any | null>(null)
  const [editCollectionName, setEditCollectionName] = useState('')
  const [editCreating, setEditCreating] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      if (typeof window === 'undefined') return []
      const raw = localStorage.getItem('pinned_collections')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      console.error('Failed to read pinned_collections from localStorage during init', err)
      return []
    }
  })

  // Close collection dropdown when clicking outside (menu buttons stop propagation)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (openCollectionMenuId) setOpenCollectionMenuId(null)
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [openCollectionMenuId])
  const [viewPostsLoading, setViewPostsLoading] = useState(false)
  const [lastFetchedIds, setLastFetchedIds] = useState<string[] | null>(null)
  const [lastFetchNote, setLastFetchNote] = useState<string | null>(null)
  // Comments / right-panel state for viewing comments (mirrors Hub behavior)
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null)
  const [postComments, setPostComments] = useState<Record<string, any[]>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  const [commentsLoadedCount, setCommentsLoadedCount] = useState<Record<string, number>>({})
  const [totalCommentsCount, setTotalCommentsCount] = useState<Record<string, number>>({})
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({})
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          router.push('/login')
          return
        }

        setUser(session.user)

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profileData) setProfile(profileData)
        setLoading(false)
      } catch (err) {
        console.error(err)
        router.push('/login')
      }
    }

    checkAuth()
  }, [supabase, router])

  useEffect(() => {
    if (!user) return

    const fetchAllyRequestCount = async () => {
      const response = await fetch('/api/get-ally-request-count')
      if (response.ok) {
        const data = await response.json()
        setAllyRequestCount(data.count || 0)
      }
    }

    fetchAllyRequestCount()

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
        async () => {
          await fetchAllyRequestCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [user, supabase])

  // persist pinned ids to localStorage when they change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pinned_collections', JSON.stringify(pinnedIds))
      }
    } catch (err) {
      console.error('Failed to save pinned_collections to localStorage', err)
    }
  }, [pinnedIds])

  useEffect(() => {
    const fetchAllies = async () => {
      try {
        if (!user) return
        setRightSidebarLoading(true)
        const { data } = await supabase
          .from('allies')
          .select('*, profiles(*)')
          .or(`user_id.eq.${user.id},ally_id.eq.${user.id}`)

        if (data) {
          setAllies(data)
        }
      } catch (err) {
        console.error('Error fetching allies', err)
      } finally {
        setRightSidebarLoading(false)
      }
    }

    fetchAllies()
  }, [user, supabase])

  // Realtime subscription: update viewedCollection/viewedPosts when collection's saved_posts change
  useEffect(() => {
    if (!user || !viewedCollection) return

    const channel = supabase
      .channel(`collections-${viewedCollection.collection_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'collections', filter: `collection_id=eq.${viewedCollection.collection_id}` },
        async (payload: any) => {
          try {
            const newRecord = payload?.new
            if (!newRecord) return
            setViewedCollection(newRecord)

            let ids = Array.isArray(newRecord.saved_posts) ? newRecord.saved_posts : []
            ids = ids.map((x: any) => {
              if (typeof x === 'string') {
                try {
                  const parsed = JSON.parse(x)
                  if (parsed && parsed.id) return parsed.id
                } catch (e) {}
                return x
              }
              return (x && x.id) || ''
            }).filter(Boolean)

            // Compute diffs: if some ids are missing from current viewedPosts, remove them immediately
            setViewedPosts(prev => prev.filter(p => ids.includes(p.id)))

            // If there are new ids not present, fetch them and add in order
            const existingIds = new Set((viewedPosts || []).map(p => p.id))
            const missing = ids.filter((id: string) => !existingIds.has(id))
            if (missing.length > 0) {
              const newPosts = await fetchPostsByIds(missing)
              // merge and order according to ids
              const merged = ids.map((id: string) => {
                return (viewedPosts || []).find((p: any) => p.id === id) || newPosts.find((np: any) => np.id === id)
              }).filter(Boolean)
              setViewedPosts(merged)
            }
          } catch (e) {
            console.warn('Error handling realtime collection update:', e)
          }
        }
      )
      .subscribe()

    return () => {
      try { supabase.removeChannel(channel) } catch (e) {}
    }
  }, [user, viewedCollection, supabase, viewedPosts])

  // Optimistic local removal: listen for custom events dispatched by PostCard when a post is removed
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const { collectionId, postId } = e?.detail || {}
        if (!collectionId || !postId) return
        if (!viewedCollection || viewedCollection.collection_id !== collectionId) return

        setViewedPosts((prev: any[] = []) => prev.filter((p: any) => p.id !== postId))

        setViewedCollection((prev: any | null) => {
          if (!prev) return prev
          const saved = Array.isArray(prev.saved_posts) ? prev.saved_posts.filter((x: any) => {
            let id = ''
            if (typeof x === 'string') {
              try {
                const parsed = JSON.parse(x)
                id = parsed?.id || x
              } catch (err) {
                id = x
              }
            } else {
              id = (x && x.id) || ''
            }
            return id !== postId
          }) : prev.saved_posts
          return { ...prev, saved_posts: saved }
        })
        // Also update collections list counts optimistically
        setCollections(prev => prev.map(col => {
          if (!col || col.collection_id !== collectionId) return col
          const saved = Array.isArray(col.saved_posts) ? col.saved_posts.filter((x: any) => {
            let id = ''
            if (typeof x === 'string') {
              try { const parsed = JSON.parse(x); id = parsed?.id || x } catch (err) { id = x }
            } else { id = (x && x.id) || '' }
            return id !== postId
          }) : col.saved_posts
          return { ...col, saved_posts: saved }
        }))
      } catch (err) {
        console.warn('Error handling collectionPostRemoved event', err)
      }
    }

    window.addEventListener('collectionPostRemoved', handler as EventListener)
    return () => {
      window.removeEventListener('collectionPostRemoved', handler as EventListener)
    }
  }, [viewedCollection])

  // Fetch collections for current user
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        if (!user) return
        const { data } = await supabase
          .from('collections')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })

        if (data) setCollections(data)
      } catch (err) {
        console.error('Error fetching collections', err)
      }
    }

    fetchCollections()
  }, [user, supabase])

  // Remove collection with optimistic UI update
  const removeCollection = async (collectionId: string) => {
    if (!collectionId) return
    const snapshot = collections
    // optimistic remove from list
    setCollections(prev => prev.filter(c => c.collection_id !== collectionId))
    // if the removed collection is currently viewed, close viewer
    if (viewedCollection && viewedCollection.collection_id === collectionId) {
      setViewModalOpen(false)
      setViewedCollection(null)
      setViewedPosts([])
    }
    setIsDeleting(true)
    setDeleteError(null)
    try {
      // Diagnostics: verify client and session
      try {
        console.log('supabase.from exists?', typeof supabase?.from)
        console.log('supabase.auth exists?', !!supabase?.auth)
      } catch (e) {
        console.warn('Error inspecting supabase client shape', e)
      }

      try {
        const sess = await supabase.auth.getSession()
        console.log('supabase auth.getSession:', sess)
      } catch (e) {
        console.warn('Error fetching session from supabase client', e)
      }

      // Pre-delete: try fetching the row to confirm it exists and permissions
      try {
        const pre = await supabase.from('collections').select('*').eq('collection_id', collectionId).single()
        console.log('pre-delete select result:', pre)
      } catch (e) {
        console.warn('pre-delete select threw:', e)
      }

      const res = await supabase.from('collections').delete().eq('collection_id', collectionId).select()
      console.log('removeCollection response:', res)

      if (res && (res as any).error) {
        setCollections(snapshot)
        console.error('Failed to remove collection:', (res as any).error)
        setDeleteError(String((res as any).error.message || JSON.stringify((res as any).error)))
        return
      }

      // If the response is empty or no rows returned, surface a clear diagnostic
      if (!res || !(res as any).data || (Array.isArray((res as any).data) && (res as any).data.length === 0)) {
        setCollections(snapshot)
        console.error('No rows deleted by removeCollection, response:', res)
        setDeleteError('No rows deleted. Check collection_id, permissions, or RLS policies. See console logs for diagnostics.')
        return
      }
    } catch (err) {
      setCollections(snapshot)
      console.error('Exception deleting collection:', err)
      setDeleteError(String(err || 'Failed to remove collection'))
      return
    } finally {
      setIsDeleting(false)
      setOpenCollectionMenuId(null)
      setDeleteModalOpen(false)
      setCollectionToDelete(null)
    }
  }

  const togglePin = (collectionId: string) => {
    try {
      setPinnedIds(prev => {
        const exists = prev.includes(collectionId)
        if (exists) {
          return prev.filter(id => id !== collectionId)
        }
        // add to front to mark most-recently pinned
        return [collectionId, ...prev.filter(id => id !== collectionId)]
      })
    } catch (err) {
      console.error('Failed to toggle pin', err)
    }
  }

  const createCollection = async () => {
    setError(null)
    const name = collectionName.trim()
    if (!name) {
      setError('Name is required')
      return
    }
    if (name.length > 30) {
      setError('Name must be 30 characters or less')
      return
    }

    try {
      setCreating(true)
      const { data, error: insertErr } = await supabase
        .from('collections')
        .insert({ collection_name: name, owner_id: user.id })
        .select()

      if (insertErr) throw insertErr
      if (data && data[0]) {
        setCollections(prev => [data[0], ...prev])
        setCollectionName('')
        setModalOpen(false)
      }
    } catch (err: any) {
      console.error('Error creating collection', err)
      setError(err.message || 'Failed to create collection')
    } finally {
      setCreating(false)
    }
  }

  const updateCollection = async () => {
    setEditError(null)
    const name = editCollectionName.trim()
    if (!editingCollection) return
    if (!name) {
      setEditError('Name is required')
      return
    }
    if (name.length > 30) {
      setEditError('Name must be 30 characters or less')
      return
    }

    if (editingCollection.owner_id && user && editingCollection.owner_id !== user.id) {
      setEditError('You are not the owner of this collection')
      return
    }

    try {
      setEditCreating(true)
      const { data, error: updateErr } = await supabase
        .from('collections')
        .update({ collection_name: name })
        .eq('collection_id', editingCollection.collection_id)
        .select()

      if (updateErr) throw updateErr
      if (data && data[0]) {
        const updated = data[0]
        setCollections(prev => prev.map(col => (col.collection_id === updated.collection_id ? updated : col)))
        if (viewedCollection && viewedCollection.collection_id === updated.collection_id) setViewedCollection(updated)
        setEditCollectionName('')
        setEditingCollection(null)
        setEditModalOpen(false)
      }
    } catch (err: any) {
      console.error('Error updating collection', err)
      setEditError(err.message || 'Failed to update collection')
    } finally {
      setEditCreating(false)
    }
  }

  // Fetch comments for a post (simple paginated loader)
  const fetchPostComments = async (postId: string, loadMore: boolean = false) => {
    const COMMENTS_PER_PAGE = 10
    const currentLoaded = commentsLoadedCount[postId] || 0
    const offset = loadMore ? currentLoaded : 0

    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }))

      if (!loadMore) {
        const { count } = await supabase
          .from('post_comments')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId)

        setTotalCommentsCount(prev => ({ ...prev, [postId]: count || 0 }))
      }

      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('id, content, user_id, created_at, updated_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .range(offset, offset + COMMENTS_PER_PAGE - 1)

      if (error) {
        console.error('Error fetching comments:', error)
        if (!loadMore) setPostComments(prev => ({ ...prev, [postId]: [] }))
        return
      }

      if (!comments || comments.length === 0) {
        if (!loadMore) setPostComments(prev => ({ ...prev, [postId]: [] }))
        setLoadingComments(prev => ({ ...prev, [postId]: false }))
        return
      }

      const userIds = [...new Set(comments.map((c: any) => c.user_id))]
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, equipped_frame')
        .in('id', userIds)

      if (profileError) {
        console.error('Error fetching comment author profiles:', profileError)
      }

      const profilesMap = new Map()
      profiles?.forEach((p: any) => profilesMap.set(p.id, p))

      const enrichedComments = comments.map((c: any) => ({ ...c, profiles: profilesMap.get(c.user_id) }))

      setPostComments(prev => ({
        ...prev,
        [postId]: loadMore ? [...(prev[postId] || []), ...enrichedComments] : enrichedComments
      }))

      setCommentsLoadedCount(prev => ({ ...prev, [postId]: offset + enrichedComments.length }))
    } catch (err) {
      console.error('Exception while fetching comments:', err)
      if (!loadMore) setPostComments(prev => ({ ...prev, [postId]: [] }))
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  // Helper: fetch posts by array of ids with same robust fallbacks used elsewhere
  const fetchPostsByIds = async (ids: string[]) => {
    if (!ids || ids.length === 0) return []
    try {
      // Try batch fetch with join
      const { data: batchData, error: batchErr } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .in('id', ids)

      if (batchErr) {
        console.warn('Batch fetch error (collections helper):', String(batchErr?.message || batchErr))
      }

      let gathered: any[] = Array.isArray(batchData) ? batchData : []

      // simple select fallback
      if ((!gathered || gathered.length === 0)) {
        const { data: simpleBatch, error: simpleErr } = await supabase
          .from('posts')
          .select('*')
          .in('id', ids)
        if (simpleErr) console.warn('Simple batch fetch error (collections helper):', String(simpleErr?.message || simpleErr))
        if (Array.isArray(simpleBatch) && simpleBatch.length > 0) gathered = simpleBatch
      }

      // per-id fallback
      if ((!gathered || gathered.length === 0)) {
        const perPostPromises = ids.map((id: string) =>
          supabase
            .from('posts')
            .select('*, profiles(*)')
            .eq('id', id)
            .maybeSingle()
        )
        const results = await Promise.all(perPostPromises)
        gathered = results.map((r: any) => r.data).filter(Boolean)
      }

      // attach profiles if missing
      if (gathered && gathered.length > 0 && !gathered[0].profiles) {
        const userIds = Array.from(new Set(gathered.map((p: any) => p.user_id).filter(Boolean)))
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesErr } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds)
          if (!profilesErr && Array.isArray(profilesData)) {
            const profilesMap = new Map(profilesData.map((pf: any) => [pf.id, pf]))
            gathered = gathered.map((post: any) => ({ ...post, profiles: profilesMap.get(post.user_id) || null }))
          }
        }
      }

      const ordered = ids.map((id: string) => gathered.find((p: any) => p.id === id)).filter(Boolean)
      return ordered
    } catch (err) {
      console.warn('Exception in fetchPostsByIds:', err)
      return []
    }
  }

  // Helper: fetch collection by id and open viewer
  const fetchAndOpenCollection = async (collectionId: string) => {
    setViewPostsLoading(true)
    try {
      const { data: colFresh, error: colErr } = await supabase
        .from('collections')
        .select('*')
        .eq('collection_id', collectionId)
        .single()

      if (colErr) {
        console.warn('Error fetching collection', colErr)
        // fallback: open empty view
        const found = collections.find(c => c.collection_id === collectionId) || null
        setViewedCollection(found)
        setViewedPosts([])
        setViewModalOpen(true)
        return
      }

      setViewedCollection(colFresh)
      let ids = Array.isArray(colFresh.saved_posts) ? colFresh.saved_posts : []
      ids = ids.map((x: any) => {
        if (typeof x === 'string') {
          try {
            const parsed = JSON.parse(x)
            if (parsed && parsed.id) return parsed.id
          } catch (e) {}
          return x
        }
        return (x && x.id) || ''
      }).filter(Boolean)

      setLastFetchedIds(ids)
      if (ids.length === 0) {
        setViewedPosts([])
        setViewModalOpen(true)
        return
      }

      const posts = await fetchPostsByIds(ids)
      setViewedPosts(posts)
      setLastFetchNote(`DB fetch returned ${posts.length} post(s); final displayed ${posts.length} post(s)`)
      setViewModalOpen(true)
    } catch (err) {
      console.warn('Error fetching posts for collection', err)
      setViewedPosts([])
      setViewModalOpen(true)
    } finally {
      setViewPostsLoading(false)
    }
  }

  // Add a new comment to a post
  const addComment = async (postId: string, content: string) => {
    if (!user || !content.trim()) return
    setSubmittingComments(prev => ({ ...prev, [postId]: true }))

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert([{ post_id: postId, user_id: user.id, content }])
        .select('id, content, user_id, created_at, updated_at')

      if (error) {
        console.error('Error adding comment:', error)
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, equipped_frame')
        .eq('id', user.id)
        .single()

      const enriched = { ...(data && data[0]), profiles: profileData }

      setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), enriched] }))
      setNewCommentText(prev => ({ ...prev, [postId]: '' }))
      setTotalCommentsCount(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }))
      setCommentsLoadedCount(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }))
    } catch (err) {
      console.error('Exception while adding comment:', err)
    } finally {
      setSubmittingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  // Share panel state and handlers (copied from Hub for parity)
  const [sharePostId, setSharePostId] = useState<string | null>(null)
  const [shareSearchQuery, setShareSearchQuery] = useState('')
  const [shareConversations, setShareConversations] = useState<any[]>([])
  const [isLoadingShareConversations, setIsLoadingShareConversations] = useState(false)
  const [conversationDMPermissions, setConversationDMPermissions] = useState<Record<string, boolean>>({})
  const [selectedShareRecipients, setSelectedShareRecipients] = useState<Set<string>>(new Set())

  const fetchShareConversations = async () => {
    if (!user) return

    setConversationDMPermissions({})
    setShareConversations([])
    setIsLoadingShareConversations(true)
    try {
      const { data: userConversations, error: convError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id)

      if (convError) {
        console.error('Error fetching conversations:', convError)
        setShareConversations([])
        return
      }

      if (!userConversations || userConversations.length === 0) {
        setShareConversations([])
        return
      }

      const conversationsWithProfiles: any[] = []
      const dmPermissions: Record<string, boolean> = {}

      for (const conv of userConversations) {
        const { data: members, error: memberError } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id)
          .neq('user_id', user.id)

        if (memberError) continue
        if (!members || members.length === 0) continue

        const otherUserId = members[0].user_id

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, equipped_frame')
          .eq('id', otherUserId)
          .single()

        if (profileError) continue

        // Check DM permissions
        const { data: otherUserSettings } = await supabase
          .from('user_settings')
          .select('dm_permissions')
          .eq('user_id', otherUserId)
          .maybeSingle()

        const dmPermissionSetting = otherUserSettings?.dm_permissions || 'everyone'
        let canMessage = false
        if (dmPermissionSetting === 'everyone') canMessage = true
        else if (dmPermissionSetting === 'allies_only') {
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
          canMessage = areAllies
        } else if (dmPermissionSetting === 'nobody') {
          canMessage = false
        }

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

          if (iBlockedThem || theyBlockedMe) canMessage = false
        }

        conversationsWithProfiles.push({
          conversation_id: conv.conversation_id,
          id: conv.conversation_id,
          otherUserId,
          profile: profileData
        })

        dmPermissions[conv.conversation_id] = canMessage
      }

      setShareConversations(conversationsWithProfiles)
      setConversationDMPermissions(dmPermissions)
      setSelectedShareRecipients(new Set())
    } catch (err) {
      console.error('Error in fetchShareConversations:', err)
      setShareConversations([])
    } finally {
      setIsLoadingShareConversations(false)
    }
  }

  const handleSharePost = async () => {
    if (!sharePostId || selectedShareRecipients.size === 0) return
    try {
      setIsLoadingShareConversations(true)
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

        if (error) console.error('Error sending message to conversation', conversationId, ':', error)
      }

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#181818]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff4234] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // sort collections so pinned ones appear first in the order of pinnedIds (most recent first)
  const sortedCollections = [...collections].sort((a: any, b: any) => {
    const ai = pinnedIds.indexOf(a.collection_id)
    const bi = pinnedIds.indexOf(b.collection_id)
    const aPinned = ai !== -1
    const bPinned = bi !== -1
    if (aPinned || bPinned) {
      if (!aPinned) return 1
      if (!bPinned) return -1
      return ai - bi
    }
    // fallback: most recently created first
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })

  // For now we show the empty state (no collections)
  return (
    <div className="min-h-screen bg-[#181818] text-white">
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="hidden md:flex md:flex-col w-72 bg-[#1f1f1f] border-r border-gray-800 py-6 px-4">
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

          {profile && (
            <div className="px-2 mb-8">
              <div className="flex items-center gap-3">
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
                  <img src="/Visuals/ClannectCoin.png" alt="Cloin" className="w-5 h-5 pointer-events-none select-none" draggable={false} />
                  <span className="text-white font-semibold text-sm">{profile.cloin || 0}</span>
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-gray-800 mx-2 mb-6"></div>

          <div className="flex-1 px-2">
            <div className="space-y-1">
              {[
                { id: 'hub', label: 'Hub', icon: Home },
                { id: 'post', label: 'Post', icon: Plus },
                { id: 'allies', label: 'Allies', icon: Users },
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'collections', label: 'Collections', icon: Bookmark },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((item: any) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/${item.id}`)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                      activeSidebarTab === item.id
                        ? 'bg-[#ff4234] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{item.label}</span>
                    {item.id === 'allies' && allyRequestCount > 0 && (
                      <span className="ml-auto flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-fit">
                        {allyRequestCount > 9 ? '+9' : allyRequestCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="px-2">
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2.5 px-3 rounded-lg transition-all duration-200 text-sm"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-[#181818] border-r border-gray-800 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ff4234]/20">
                  <Bookmark size={32} className="text-[#ff4234]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Collections</h1>
                  <p className="text-gray-400 mt-1">You can create multiple collections and save any post to your collections. Click the button above called "New Collection" and create your first one!</p>
                {/* Right share panel (fixed, mutually exclusive with comments) */}
                <div className={`fixed right-0 top-0 h-full w-96 bg-[#1f1f1f] border-l border-gray-800 transform transition-transform duration-300 ease-in-out z-[9999] overflow-y-auto flex flex-col ${sharePostId ? 'translate-x-0' : 'translate-x-full'}`}>
                  {sharePostId && (
                    <>
                      <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
                        <h3 className="text-white font-bold">Share Post</h3>
                        <button onClick={() => setSharePostId(null)} className="p-1 hover:bg-gray-800 rounded transition-colors" title="Close share">
                          <X size={18} className="text-gray-300" />
                        </button>
                      </div>

                      <div className="p-5 border-b border-gray-800 flex-shrink-0">
                        <input
                          type="text"
                          placeholder="Search people..."
                          value={shareSearchQuery}
                          onChange={(e) => setShareSearchQuery(e.target.value)}
                          className="w-full bg-[#252525] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

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
                                const isSelected = selectedShareRecipients.has(conv.conversation_id)

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
                                      if (newSelected.has(conv.conversation_id)) newSelected.delete(conv.conversation_id)
                                      else newSelected.add(conv.conversation_id)
                                      setSelectedShareRecipients(newSelected)
                                    }}
                                  >
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

                                    <AvatarWithFrame
                                      src={profile?.avatar_url}
                                      alt={profile.username}
                                      equippedFrame={profile?.equipped_frame}
                                      size="sm"
                                      frameScale={1.25}
                                      className="flex-shrink-0"
                                    />

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white text-sm font-semibold truncate">{profile?.display_name || profile?.username}</span>
                                        {!canMessage && (<span className="text-gray-500 text-xs flex-shrink-0">🔒 Can't DM</span>)}
                                      </div>
                                      <span className="text-gray-500 text-xs truncate">@{profile?.username}</span>
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        )}
                      </div>

                      {shareConversations.length > 0 && (
                        <div className="px-5 py-4 border-t border-gray-800 bg-[#252525]/50 flex-shrink-0">
                          <button
                            onClick={handleSharePost}
                            disabled={selectedShareRecipients.size === 0 || isLoadingShareConversations}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-medium"
                          >
                            {isLoadingShareConversations ? 'Sending...' : `Send to ${selectedShareRecipients.size} conversation(s)`}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                </div>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => setModalOpen(true)}
                  className="bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  New Collection
                </button>
              </div>
            </div>

            {/* Collections grid / Empty state content */}
            <div className="mt-8">
              {collections.length === 0 ? (
                <div className="rounded-lg border border-gray-800 bg-[#1f1f1f] p-8 text-center">
                  <h2 className="text-xl font-semibold text-white mb-2">No Collections Yet</h2>
                  <p className="text-gray-400">Create your first collection to save posts you love and organize them for later.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {sortedCollections.map((c) => (
                        <div key={c.collection_id} className="relative rounded-xl border border-gray-800 bg-gradient-to-b from-[#1f1f1f] to-[#171717] p-4 flex flex-col items-start gap-3 cursor-pointer hover:border-gray-700 hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                          {/* clicking card opens viewer */}
                          <div onClick={() => fetchAndOpenCollection(c.collection_id)} className="w-full pr-10">
                            <div className="flex items-center justify-between w-full">
                              <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-[#ff4234]/10 border border-gray-800">
                                <Folder size={24} className="text-[#ff4234]" />
                              </div>
                              <div className="text-xs text-gray-400">{(c.saved_posts && Array.isArray(c.saved_posts)) ? c.saved_posts.length : 0} items</div>
                            </div>
                            <div className="mt-2 w-full">
                              <h3 className="text-white font-medium truncate">{c.collection_name}</h3>
                              <p className="text-gray-400 text-xs mt-1">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</p>
                            </div>
                          </div>

                          {/* Pinned indicator */}
                          {pinnedIds.includes(c.collection_id) && (
                            <div className="absolute top-3 right-12 flex items-center">
                              <Pin size={16} className="text-yellow-400" />
                            </div>
                          )}

                          {/* Three-dot menu (copy PostCard style) */}
                          <div className="absolute top-3 right-3">
                            <div className="relative">
                              <button onClick={(e) => { e.stopPropagation(); setOpenCollectionMenuId(id => id === c.collection_id ? null : c.collection_id) }} className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"><MoreVertical size={18} /></button>
                              {openCollectionMenuId === c.collection_id && (
                                <div onClick={(e) => e.stopPropagation()} className="absolute right-0 mt-2 w-48 bg-[#252525] border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                                  <button onClick={(e) => { e.stopPropagation(); togglePin(c.collection_id); setOpenCollectionMenuId(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                                    <Pin size={18} />
                                    <span>{pinnedIds.includes(c.collection_id) ? 'Unpin Collection' : 'Pin Collection'}</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingCollection(c)
                                      setEditCollectionName(c.collection_name || '')
                                      setEditError(null)
                                      setEditModalOpen(true)
                                      setOpenCollectionMenuId(null)
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left"
                                  >
                                    <Edit2 size={18} />
                                    <span>Edit Collection</span>
                                  </button>
                                  <div className="border-t border-gray-700" />
                                  <button onClick={(e) => { e.stopPropagation(); setCollectionToDelete(c); setDeleteError(null); setDeleteModalOpen(true); setOpenCollectionMenuId(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] transition-colors text-left">
                                    <Trash2 size={18} />
                                    <span>Remove Collection</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <RightSidebar allies={allies} />
      </div>
        {/* Delete Collection Modal */}
        {deleteModalOpen && collectionToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl p-6 max-w-sm w-full mx-4 border border-gray-800">
              <h2 className="text-white font-bold text-lg mb-2">Delete Collection?</h2>
              <p className="text-gray-400 text-sm mb-4">Are you sure you want to delete the collection <span className="font-semibold text-white">{collectionToDelete.collection_name}</span>? This will permanently remove the collection and its saved references. This action cannot be undone.</p>
              {deleteError && <p className="text-red-400 text-sm mb-3">{deleteError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setCollectionToDelete(null)
                    setDeleteError(null)
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!collectionToDelete) return
                    await removeCollection(collectionToDelete.collection_id)
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      {/* New Collection Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="bg-[#1f1f1f] rounded-lg p-6 z-10 w-full max-w-md text-center shadow-lg">
            <div className="flex items-center justify-center mb-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#ff4234]/20">
                <Folder size={20} className="text-[#ff4234]" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Create New Collection</h3>
            <p className="text-gray-400 mb-4">Enter a name for your collection.</p>
            <input
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              maxLength={30}
              className="w-full bg-[#171717] border border-gray-800 rounded-lg p-3 text-white mb-2 placeholder-gray-500 focus:outline-none focus:border-[#ff4234] focus:ring-2 focus:ring-[#ff4234]/20"
              placeholder="Collection name"
            />
            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <div>{error && <span className="text-red-400">{error}</span>}</div>
              <div>{collectionName.length}/30</div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-transparent border border-gray-700 text-gray-200 hover:bg-white/2">Cancel</button>
              <button
                disabled={creating || collectionName.trim().length === 0}
                onClick={createCollection}
                className={`px-4 py-2 rounded-lg font-semibold shadow-sm ${creating || collectionName.trim().length === 0 ? 'bg-gray-600 text-gray-200 cursor-not-allowed' : 'bg-[#ff4234] text-white hover:brightness-95'}`}
              >
                {creating ? 'Creating...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Collection Modal */}
      {editModalOpen && editingCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditModalOpen(false)} />
          <div className="bg-[#1f1f1f] rounded-lg p-6 z-10 w-full max-w-md text-center shadow-lg">
            <div className="flex items-center justify-center mb-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#ff4234]/20">
                <Folder size={20} className="text-[#ff4234]" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Edit Collection</h3>
            <p className="text-gray-400 mb-4">Change the name of your collection.</p>
            <input
              value={editCollectionName}
              onChange={(e) => setEditCollectionName(e.target.value)}
              maxLength={30}
              className="w-full bg-[#171717] border border-gray-800 rounded-lg p-3 text-white mb-2 placeholder-gray-500 focus:outline-none focus:border-[#ff4234] focus:ring-2 focus:ring-[#ff4234]/20"
              placeholder="Collection name"
            />
            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <div>{editError && <span className="text-red-400">{editError}</span>}</div>
              <div>{editCollectionName.length}/30</div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setEditModalOpen(false); setEditingCollection(null); setEditError(null) }} className="px-4 py-2 rounded-lg bg-transparent border border-gray-700 text-gray-200 hover:bg-white/2">Cancel</button>
              <button
                disabled={editCreating || editCollectionName.trim().length === 0}
                onClick={updateCollection}
                className={`px-4 py-2 rounded-lg font-semibold shadow-sm ${editCreating || editCollectionName.trim().length === 0 ? 'bg-gray-600 text-gray-200 cursor-not-allowed' : 'bg-[#ff4234] text-white hover:brightness-95'}`}
              >
                {editCreating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Right comments panel (fixed) */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-[#1f1f1f] border-l border-gray-800 transform transition-transform duration-300 ease-in-out z-[9999] overflow-y-auto flex flex-col ${expandedCommentsPostId ? 'translate-x-0' : 'translate-x-full'}`}>
        {expandedCommentsPostId && (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
              <h3 className="text-white font-bold">Comments</h3>
              <button onClick={() => setExpandedCommentsPostId(null)} className="p-1 hover:bg-gray-800 rounded transition-colors" title="Close comments">
                <X size={18} className="text-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingComments[expandedCommentsPostId] ? (
                <div className="text-center text-gray-400 text-sm py-4">Loading comments...</div>
              ) : (postComments[expandedCommentsPostId] || []).length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">No comments yet</div>
              ) : (
                <div className="space-y-4">
                  {postComments[expandedCommentsPostId]?.map(comment => (
                    <div key={comment.id} className="flex gap-3 pb-4 border-b border-gray-800 last:border-b-0">
                      <div
                        onClick={() => {
                          if (comment.user_id === user?.id) router.push('/profile')
                          else router.push(`/profile/${comment.profiles?.username}`)
                        }}
                        className="flex items-start gap-2 cursor-pointer hover:bg-gray-800/30 p-1 rounded transition-colors user-select-none flex-shrink-0"
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            if (comment.user_id === user?.id) router.push('/profile')
                            else router.push(`/profile/${comment.profiles?.username}`)
                          }
                        }}
                        title={`Go to ${comment.profiles?.display_name || comment.profiles?.username}'s profile`}
                      >
                        <AvatarWithFrame src={comment.profiles?.avatar_url} alt={comment.profiles?.username} equippedFrame={comment.profiles?.equipped_frame} size="sm" frameScale={1.15} className="hover:opacity-70 transition-opacity" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p onClick={() => { if (comment.user_id === user?.id) router.push('/profile'); else router.push(`/profile/${comment.profiles?.username}`) }} className="text-white font-semibold text-sm hover:text-red-500 transition-colors cursor-pointer">{comment.profiles?.display_name || comment.profiles?.username}</p>
                            <p onClick={() => { if (comment.user_id === user?.id) router.push('/profile'); else router.push(`/profile/${comment.profiles?.username}`) }} className="text-gray-400 text-xs cursor-pointer">@{comment.profiles?.username}</p>
                          </div>
                          <div className="text-gray-400 text-xs">{comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}</div>
                        </div>
                        <div className="mt-2 text-gray-300 whitespace-pre-wrap">{comment.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                    value={newCommentText[expandedCommentsPostId || ''] || ''}
                    onChange={(e) => {
                      const text = e.target.value.slice(0, 1000)
                      setNewCommentText(prev => ({ ...prev, [expandedCommentsPostId || '']: text }))
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        addComment(expandedCommentsPostId || '', newCommentText[expandedCommentsPostId || ''] || '')
                      }
                    }}
                    rows={1}
                    className="flex-1 bg-[#1f1f1f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                  <button
                    onClick={() => addComment(expandedCommentsPostId || '', newCommentText[expandedCommentsPostId || ''] || '')}
                    disabled={!newCommentText[expandedCommentsPostId || '']?.trim() || (newCommentText[expandedCommentsPostId || '']?.length || 0) > 1000 || (submittingComments[expandedCommentsPostId || ''] || false)}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    {submittingComments[expandedCommentsPostId || ''] ? '...' : 'Post'}
                  </button>
                </div>
              </div>
              <div className="flex justify-end text-xs text-gray-500 px-11 mb-2">
                {newCommentText[expandedCommentsPostId || '']?.length || 0} / 1000
              </div>
            </div>
          </>
        )}
      </div>
      {/* Collection View Modal */}
      {viewModalOpen && viewedCollection && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/60" onClick={() => setViewModalOpen(false)} />
          <div className="relative z-20 w-full max-w-4xl mx-4 bg-[#171717] rounded-lg p-4 overflow-y-auto max-h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-[#ff4234]/10 border border-gray-800">
                  <Folder size={18} className="text-[#ff4234]" />
                </div>
                <div>
                  <h3 className="text-white font-bold">{viewedCollection.collection_name}</h3>
                  <p className="text-gray-400 text-sm">{(viewedCollection.saved_posts && Array.isArray(viewedCollection.saved_posts)) ? viewedCollection.saved_posts.length : 0} items</p>
                </div>
              </div>
              <button onClick={() => setViewModalOpen(false)} className="p-2 hover:bg-gray-800 rounded transition-colors text-gray-300" title="Close">
                <X size={20} />
              </button>
            </div>

            {/* Diagnostics removed: hide internal fetch notes from users */}

            <div>
              {viewPostsLoading ? (
                <p className="text-gray-400">Loading posts...</p>
              ) : viewedPosts.length === 0 ? (
                <p className="text-gray-400">No saved posts in this collection yet.</p>
              ) : (
                <div className="space-y-4">
                  {viewedPosts.map((post) => (
                    <PostCard key={post.id} post={post}
                      onOpenComments={(postId) => {
                        setExpandedCommentsPostId(prev => {
                          const willOpen = prev !== postId
                          if (willOpen) {
                            fetchPostComments(postId)
                            setSharePostId(null)
                          }
                          return willOpen ? postId : null
                        })
                      }}
                      onOpenShare={(postId) => {
                        setSharePostId(prev => {
                          const willOpen = prev !== postId
                          if (willOpen) {
                            setExpandedCommentsPostId(null)
                            fetchShareConversations()
                          }
                          return willOpen ? postId : null
                        })
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
