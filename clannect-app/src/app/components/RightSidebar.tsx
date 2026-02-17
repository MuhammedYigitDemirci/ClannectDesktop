'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { X, Ban, Pin } from 'lucide-react'
import AvatarWithFrame from './AvatarWithFrame'

interface Conversation {
  conversation_id: string
  other_user_id: string
  profile?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    equipped_frame: number | null
  }
  unreadCount?: number
  lastMessageAt?: string
  lastMessage?: string
  lastMessageDate?: string
}

interface RightSidebarProps {
  allies?: any[] // Keep for backward compatibility but won't use it
}

export default function RightSidebar({ allies }: RightSidebarProps) {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  const [searchQuery, setSearchQuery] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [hiddenConversations, setHiddenConversations] = useState<Set<string>>(() => {
    // Load hidden conversations from localStorage immediately on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hiddenConversations')
      if (stored) {
        try {
          return new Set(JSON.parse(stored))
        } catch (err) {
          console.error('Error loading hidden conversations:', err)
        }
      }
    }
    return new Set()
  })
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(() => {
    // Load pinned conversations from localStorage immediately on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pinnedConversations')
      if (stored) {
        try {
          return new Set(JSON.parse(stored))
        } catch (err) {
          console.error('Error loading pinned conversations:', err)
        }
      }
    }
    return new Set()
  })
  const [loading, setLoading] = useState(true)
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set()) // Users I blocked or who blocked me
  const supabase = createClient()

  // Format message date to show relative time
  const formatMessageDate = (dateString: string) => {
    if (!dateString) return ''
    
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    // Otherwise show the date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  // Truncate message to prevent wrapping
  const truncateMessage = (message: string, maxLength: number = 40) => {
    if (!message) return ''
    if (message.length > maxLength) {
      return message.substring(0, maxLength) + '...'
    }
    return message
  }

  // Fetch unread message count for a conversation
  const fetchUnreadCount = async (conversationId: string, userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return 0

      // Get the last message read timestamp for this conversation
      const { data: readStatus } = await supabase
        .from('conversation_members')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', session.user.id)
        .single()

      const lastReadAt = readStatus?.last_read_at ? new Date(readStatus.last_read_at) : null

      // Get messages after the last read timestamp
      let query = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)

      // Only count messages not sent by current user
      query = query.neq('sender_id', session.user.id)

      if (lastReadAt) {
        query = query.gt('created_at', lastReadAt.toISOString())
      }

      const { count } = await query

      return count || 0
    } catch (err) {
      console.error('Error fetching unread count:', err)
      return 0
    }
  }

  // Save hidden conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('hiddenConversations', JSON.stringify(Array.from(hiddenConversations)))
  }, [hiddenConversations])

  // Save pinned conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pinnedConversations', JSON.stringify(Array.from(pinnedConversations)))
  }, [pinnedConversations])

  

  // Listen for storage changes and custom events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pinnedConversations') {
        try {
          const stored = localStorage.getItem('pinnedConversations')
          setPinnedConversations(new Set(stored ? JSON.parse(stored) : []))
        } catch (err) {
          console.error('Error loading pinned conversations:', err)
        }
      }
    }

    const handlePinnedChanged = () => {
      try {
        const stored = localStorage.getItem('pinnedConversations')
        setPinnedConversations(new Set(stored ? JSON.parse(stored) : []))
      } catch (err) {
        console.error('Error loading pinned conversations:', err)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('pinnedConversationsChanged', handlePinnedChanged)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('pinnedConversationsChanged', handlePinnedChanged)
    }
  }, [])

  // Fetch blocked users (users I blocked or who blocked me)
  const fetchBlockedUsers = async (currentUserId: string) => {
    try {
      // Get users I blocked
      const { data: iBlocked } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', currentUserId)

      // Get users who blocked me
      const { data: blockedMe } = await supabase
        .from('blocked_users')
        .select('blocker_id')
        .eq('blocked_id', currentUserId)

      const blockedSet = new Set<string>()
      
      if (iBlocked) {
        iBlocked.forEach(b => blockedSet.add(b.blocked_id))
      }
      if (blockedMe) {
        blockedMe.forEach(b => blockedSet.add(b.blocker_id))
      }

      setBlockedUsers(blockedSet)
      return blockedSet
    } catch (err) {
      console.error('Error fetching blocked users:', err)
      return new Set<string>()
    }
  }

  // Fetch conversations for the current user
  useEffect(() => {
    let isMounted = true

    const fetchConversations = async (showLoading: boolean = false) => {
      try {
        if (showLoading) {
          setLoading(true)
        }
        
        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !isMounted) {
          setConversations([])
          return
        }

        const currentUserId = session.user.id

        // Fetch blocked users
        await fetchBlockedUsers(currentUserId)

        // Get all conversations for the current user
        const { data: userConversations, error: convError } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', currentUserId)

        if (convError || !isMounted) {
          console.error('Error fetching conversations:', convError)
          if (showLoading) {
            setLoading(false)
          }
          return
        }

        if (!userConversations || userConversations.length === 0) {
          if (isMounted) {
            setConversations([])
            setLoading(false)
          }
          return
        }

        // For each conversation, get the other member
        const conversationsList: Conversation[] = []

        for (const conv of userConversations) {
          if (!isMounted) return

          const { data: members, error: memberError } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)
            .neq('user_id', currentUserId)

          if (memberError) {
            console.error('Error fetching conversation members:', memberError)
            continue
          }

          if (!members || members.length === 0) continue

          const otherUserId = members[0].user_id

          // Get the other user's profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, equipped_frame')
            .eq('id', otherUserId)
            .single()

          // If profile doesn't exist (user was deleted), skip this conversation
          if (profileError) {
            if (profileError.code === 'PGRST116') {
              // User was deleted, skip this conversation
              continue
            }
            console.error('Error fetching profile:', profileError)
            continue
          }

          conversationsList.push({
            conversation_id: conv.conversation_id,
            other_user_id: otherUserId,
            profile: profile,
            lastMessageAt: undefined, // Will be fetched
          })
        }

        // Fetch unread counts and last message for each conversation
        for (let i = 0; i < conversationsList.length; i++) {
          if (!isMounted) return

          const unreadCount = await fetchUnreadCount(conversationsList[i].conversation_id, currentUserId)
          // Only set unreadCount if it's greater than 0 AND this is not the current conversation
          if (unreadCount > 0 && conversationsList[i].other_user_id !== userId) {
            conversationsList[i].unreadCount = unreadCount
          } else if (conversationsList[i].other_user_id === userId) {
            // If viewing this conversation, explicitly clear unread count
            conversationsList[i].unreadCount = undefined
          }

          // Get the latest message in this conversation
          try {
            const { data: lastMessages } = await supabase
              .from('messages')
              .select('content, created_at, post_id')
              .eq('conversation_id', conversationsList[i].conversation_id)
              .order('created_at', { ascending: false })
              .limit(1)

            const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null
            conversationsList[i].lastMessageAt = lastMessage?.created_at || new Date(0).toISOString()
            conversationsList[i].lastMessage = lastMessage?.post_id ? 'Post Sent' : (lastMessage?.content || '')
            conversationsList[i].lastMessageDate = lastMessage?.created_at || ''
          } catch (err) {
            // Silently handle error
          }
        }

        // Sort conversations by most recent message first
        conversationsList.sort((a, b) => {
          const timeA = new Date(a.lastMessageAt || 0).getTime()
          const timeB = new Date(b.lastMessageAt || 0).getTime()
          return timeB - timeA
        })

        if (isMounted) {
          setConversations(conversationsList)
          if (showLoading) {
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Error in fetchConversations:', err)
        if (isMounted) {
          setConversations([])
          if (showLoading) {
            setLoading(false)
          }
        }
      }
    }

    // Fetch immediately on mount with loading indicator
    fetchConversations(true)

    // Then poll every 3 seconds for updates (without loading indicator)
    const pollInterval = setInterval(() => {
      fetchConversations(false)
    }, 3000)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
    }
  }, [supabase])

  // Subscribe to new messages to unhide conversations and update unread counts
  useEffect(() => {
    let messageChannel: any = null
    let isCleanedUp = false

    const setupMessageSubscription = async () => {
      try {
        if (isCleanedUp) return

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          return
        }

        const currentUserId = session.user.id

        messageChannel = supabase
          .channel('messages-realtime')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            async (payload: any) => {
              console.log('🎯 MESSAGE RECEIVED IN SIDEBAR - Event fired!', payload.new)
              
              const newMessage = payload.new

              // Fetch the latest message for this conversation to ensure accuracy
              try {
                const { data: latestMessages } = await supabase
                  .from('messages')
                  .select('id, content, created_at, sender_id')
                  .eq('conversation_id', newMessage.conversation_id)
                  .order('created_at', { ascending: false })
                  .limit(1)

                const latestMessage = latestMessages && latestMessages.length > 0 ? latestMessages[0] : null
                if (!latestMessage) {
                  return
                }

                console.log('✅ Latest message fetched:', latestMessage)

                // Update conversations with the latest message
                setConversations(prev => {
                  const conversationExists = prev.some(c => c.conversation_id === newMessage.conversation_id)
                  
                  if (!conversationExists) {
                    console.warn('⚠️ Conversation not in list, skipping update')
                    return prev
                  }
                  
                  const updated = prev.map(c => {
                    if (c.conversation_id === newMessage.conversation_id) {
                      console.log('📝 Updating conversation with latest message')
                      const updatedConversation: Conversation = {
                        ...c,
                        lastMessageAt: latestMessage.created_at,
                        lastMessage: newMessage.post_id ? 'Post Sent' : (latestMessage.content || ''),
                        lastMessageDate: latestMessage.created_at,
                      }
                      // Only increment unread count for messages from OTHER users
                      if (latestMessage.sender_id !== currentUserId) {
                        updatedConversation.unreadCount = (c.unreadCount || 0) + 1
                        console.log('📌 Incremented unread to:', updatedConversation.unreadCount)
                      } else {
                        console.log('✍️ Own message, not incrementing unread')
                      }
                      return updatedConversation
                    }
                    return c
                  })
                  
                  // Re-sort conversations by most recent message
                  updated.sort((a, b) => {
                    const timeA = new Date(a.lastMessageAt || 0).getTime()
                    const timeB = new Date(b.lastMessageAt || 0).getTime()
                    return timeB - timeA
                  })
                  
                  console.log('✨ Conversations reordered, returning updated state')
                  return updated
                })

                // Unhide the conversation
                setHiddenConversations(prev => {
                  if (prev.has(newMessage.conversation_id)) {
                    const updated = new Set(prev)
                    updated.delete(newMessage.conversation_id)
                    console.log('👁️ Unhiding conversation')
                    return updated
                  }
                  return prev
                })
              } catch (err) {
                // Silently handle error
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'conversation_members',
              filter: `user_id=eq.${currentUserId}`,
            },
            (payload: any) => {
              const updatedConversationId = payload.new?.conversation_id
              
              if (!updatedConversationId) {
                return
              }

              // Clear unreadCount when last_read_at is updated (marking as read)
              setConversations(prev =>
                prev.map(c =>
                  c.conversation_id === updatedConversationId
                    ? {
                        ...c,
                        unreadCount: undefined,
                      }
                    : c
                )
              )
            }
          )
          .subscribe()
      } catch (error) {
        console.error('Error setting up message subscription:', error)
      }
    }

    // Try to setup real-time subscription (as a bonus, not required)
    setupMessageSubscription()

    return () => {
      isCleanedUp = true
      if (messageChannel) {
        try {
          messageChannel.unsubscribe()
          supabase.removeChannel(messageChannel)
        } catch (err) {
          console.error('Error cleaning up:', err)
        }
      }
    }
  }, [supabase])

  const filteredConversations = conversations
    .filter((conv) => {
      const displayName = conv.profile?.display_name || conv.profile?.username || ''
      const username = conv.profile?.username || ''
      const searchLower = searchQuery.toLowerCase()
      
      // If search query exists
      if (searchQuery) {
        // Show if matches (even if hidden)
        return displayName.toLowerCase().includes(searchLower) || username.toLowerCase().includes(searchLower)
      }
      
      // If no search query, only show non-hidden conversations
      return !hiddenConversations.has(conv.conversation_id)
    })
    .sort((a, b) => {
      // Pinned conversations always come first
      const aIsPinned = pinnedConversations.has(a.conversation_id)
      const bIsPinned = pinnedConversations.has(b.conversation_id)
      
      if (aIsPinned && !bIsPinned) return -1
      if (!aIsPinned && bIsPinned) return 1
      
      // If both pinned or both unpinned, sort by last message date (newest first)
      const aDate = new Date(a.lastMessageAt || 0).getTime()
      const bDate = new Date(b.lastMessageAt || 0).getTime()
      return bDate - aDate
    })

  const handleHideConversation = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation()
    setHiddenConversations(prev => new Set([...prev, conversationId]))
  }

  const handlePinConversation = (conversationId: string) => {
    setPinnedConversations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId)
      } else {
        newSet.add(conversationId)
      }
      return newSet
    })
  }

  return (
    <div className="hidden lg:flex lg:flex-col w-72 bg-[#1f1f1f] border-l border-gray-800">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-800 space-y-3">
        <h3 className="text-white font-semibold">Conversations</h3>

        {/* Search Bar */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full bg-[#252525] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
        />
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-4">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">{searchQuery ? 'No conversations found' : 'No conversations yet'}</div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.conversation_id}
              onClick={() => router.push(`/conversation/${conversation.other_user_id}`)}
              className={`p-3 rounded-lg transition-all duration-200 cursor-pointer group relative ${
                userId === conversation.other_user_id
                  ? 'bg-[#ff4234] text-white ring-2 ring-red-500'
                  : 'bg-[#252525] text-gray-400 hover:bg-[#2f2f2f] hover:text-white'
              } ${searchQuery && hiddenConversations.has(conversation.conversation_id) ? 'opacity-60' : ''} ${blockedUsers.has(conversation.other_user_id) ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-shrink-0">
                  <AvatarWithFrame
                    src={conversation.profile?.avatar_url ?? undefined}
                    alt={conversation.profile?.username || 'User'}
                    equippedFrame={conversation.profile?.equipped_frame}
                    size="md"
                    frameScale={1.5}
                    className={blockedUsers.has(conversation.other_user_id) ? 'grayscale' : ''}
                  />
                  {blockedUsers.has(conversation.other_user_id) && (
                    <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-0.5">
                      <Ban size={12} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">{conversation.profile?.display_name || conversation.profile?.username}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {pinnedConversations.has(conversation.conversation_id) && (
                        <Pin size={14} style={{ color: userId === conversation.other_user_id ? '#ffffff' : '#fe4133' }} />
                      )}
                      {conversation.lastMessageDate && (
                        <p className="text-xs opacity-60 whitespace-nowrap">{formatMessageDate(conversation.lastMessageDate)}</p>
                      )}
                    </div>
                  </div>

                  {conversation.lastMessage && (
                    <p className="text-xs opacity-75 truncate">{truncateMessage(conversation.lastMessage)}</p>
                  )}
                </div>

                {userId === conversation.other_user_id && <span className="text-lg font-bold ml-auto">✓</span>}

                {conversation.unreadCount && conversation.unreadCount > 0 && userId !== conversation.other_user_id && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-fit">{conversation.unreadCount > 9 ? '+9' : conversation.unreadCount}</span>
                )}

                {searchQuery && hiddenConversations.has(conversation.conversation_id) && <span className="text-xs text-gray-500 ml-auto">hidden</span>}

                <button
                  onClick={(e) => handleHideConversation(e, conversation.conversation_id)}
                  className="absolute top-2 right-2 p-1 rounded bg-red-600 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title="Hide conversation (will reappear on new message)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
