'use client'

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { Home, Plus, Users, User, Settings, LogOut, Send, ChevronLeft, Upload, ShoppingCart, Reply, MoreVertical, Ban, Pin, Search, Bookmark } from 'lucide-react'
import GlobalLoading from '../../components/GlobalLoading'
import { createClient } from '@/lib/supabase'
import { compressPostMedia, shouldCompress } from '@/lib/imageCompression'
import RightSidebar from '../../components/RightSidebar'
import AvatarWithFrame from '../../components/AvatarWithFrame'

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string
  cloin?: number
  equipped_frame?: number | null
}

interface Ally {
  ally_id: string
  profile?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  media_url: string | null
  created_at: string
  replied_to_message_id?: string | null
  post_id?: string | null
  // Cached reply content (so we can show it even if original message isn't loaded)
  replied_to_content?: string | null
  replied_to_media_url?: string | null
  replied_to_post_id?: string | null
  replied_to_sender_name?: string | null
}

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const userId = params.userId as string

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [otherUserProfile, setOtherUserProfile] = useState<Profile | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [allies, setAllies] = useState<any[]>([])
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  const [typingUserName, setTypingUserName] = useState<string>('')
  const [otherUserDmPermissions, setOtherUserDmPermissions] = useState<string>('everyone')
  const [currentUserDmPermissions, setCurrentUserDmPermissions] = useState<string>('everyone')
  const [canSendMessage, setCanSendMessage] = useState(true)
  const [theyCanSendToMe, setTheyCanSendToMe] = useState(true)
  const [messageLockReason, setMessageLockReason] = useState<string | null>(null) // 'my_setting' or 'their_setting'
  const [accessDenied, setAccessDenied] = useState(false)
  const [repliedToMessage, setRepliedToMessage] = useState<Message | null>(null)
  const [sharedPostsData, setSharedPostsData] = useState<Record<string, any>>({})
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [isScrollingToMessage, setIsScrollingToMessage] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false) // Did I block this user?
  const [isBlockedByThem, setIsBlockedByThem] = useState(false) // Did they block me?
  const [isBlockingUser, setIsBlockingUser] = useState(false)
  const [showBlockConfirmation, setShowBlockConfirmation] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [foundMessageIds, setFoundMessageIds] = useState<string[]>([])
  const [currentFoundIndex, setCurrentFoundIndex] = useState(-1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)
  const subscriptionErrorCountRef = useRef<number>(0)
  const userMenuRef = useRef<HTMLDivElement>(null)

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
    
    const index = userId.charCodeAt(0) % gradients.length
    return gradients[index]
  }

  const broadcastTyping = (isTyping: boolean) => {
    if (!channelRef.current || !conversationId) return
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: currentUser?.id,
        is_typing: isTyping,
        display_name: currentUserProfile?.display_name || currentUserProfile?.username,
      }
    })
  }

  const checkDmPermissions = async (otherUserId: string, currentUserId: string, existingMessages: Message[]) => {
    try {
      console.log(`\n🔐 ===== DM PERMISSION CHECK START =====`)
      console.log(`Other User ID: ${otherUserId}`)
      console.log(`Current User ID: ${currentUserId}`)
      console.log(`Existing messages count: ${existingMessages?.length || 0}`)
      
      // FIRST: Check block status - this takes priority over all other settings
      const { data: iBlockedThem } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', otherUserId)
        .maybeSingle()

      const { data: theyBlockedMe } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', otherUserId)
        .eq('blocked_id', currentUserId)
        .maybeSingle()

      setIsBlocked(!!iBlockedThem)
      setIsBlockedByThem(!!theyBlockedMe)

      // If blocked, immediately return - no need to check other settings
      if (iBlockedThem) {
        console.log('🚫 YOU blocked this user - messaging disabled')
        setCanSendMessage(false)
        setTheyCanSendToMe(false)
        setMessageLockReason('you_blocked')
        return false
      }

      if (theyBlockedMe) {
        console.log('🚫 This user blocked YOU - messaging disabled')
        setCanSendMessage(false)
        setTheyCanSendToMe(false)
        setMessageLockReason('they_blocked')
        return false
      }

      // Fetch OTHER user's DM settings (can they receive messages from me?)
      const { data: otherSettings, error: otherSettingsError } = await supabase
        .from('user_settings')
        .select('dm_permissions')
        .eq('user_id', otherUserId)
        .maybeSingle()

      if (otherSettingsError) {
        console.error('Error fetching other user DM settings:', otherSettingsError)
        setCanSendMessage(true)
        setTheyCanSendToMe(true)
        return true
      }

      // Fetch MY DM settings (can I receive messages from them?)
      const { data: currentSettings, error: currentSettingsError } = await supabase
        .from('user_settings')
        .select('dm_permissions')
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (currentSettingsError) {
        console.error('Error fetching current user DM settings:', currentSettingsError)
        setCanSendMessage(true)
        setTheyCanSendToMe(true)
        return true
      }

      const otherUserDmPerm = otherSettings?.dm_permissions || 'everyone'
      const currentUserDmPerm = currentSettings?.dm_permissions || 'everyone'
      
      console.log(`Other user's DM permission: ${otherUserDmPerm}`)
      console.log(`Current user's DM permission: ${currentUserDmPerm}`)
      
      setOtherUserDmPermissions(otherUserDmPerm)
      setCurrentUserDmPermissions(currentUserDmPerm)

      // First, check if we are allies
      let areAllies = false
      const { data: allyCheck1 } = await supabase
        .from('allies')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('ally_id', otherUserId)
        .maybeSingle()

      const { data: allyCheck2 } = await supabase
        .from('allies')
        .select('id')
        .eq('user_id', otherUserId)
        .eq('ally_id', currentUserId)
        .maybeSingle()

      areAllies = !!(allyCheck1 || allyCheck2)
      console.log(`Ally check result: ${areAllies ? 'ARE allies' : 'NOT allies'}`)

      // Can I send to the other user? Check settings
      let canISendMessage = true
      let lockReason: string | null = null
      
      // First check: Do I have "allies_only" setting and we're not allies?
      if (currentUserDmPerm === 'allies_only' && !areAllies) {
        console.log('❌ MY setting is allies_only and we are NOT allies - LOCKING CONVERSATION')
        canISendMessage = false
        lockReason = 'my_setting'
      }
      // Second check: Does the other user block messages or require allies?
      else if (otherUserDmPerm === 'nobody') {
        console.log('❌ Other user blocks all messages - LOCKING CONVERSATION')
        canISendMessage = false
        lockReason = 'their_setting'
      } else if (otherUserDmPerm === 'allies_only' && !areAllies) {
        console.log('❌ Their setting is allies_only and we are NOT allies - LOCKING CONVERSATION')
        canISendMessage = false
        lockReason = 'their_setting'
      } else {
        console.log('✅ All checks passed - allowing message')
        canISendMessage = true
        lockReason = null
      }

      // Can they send to me? Check my DM setting
      let canTheySendToMe = false
      if (currentUserDmPerm === 'everyone') {
        console.log('✅ My setting allows everyone, they can send')
        canTheySendToMe = true
      } else if (currentUserDmPerm === 'allies_only') {
        if (areAllies) {
          console.log('✅ My setting is allies_only and we ARE allies, they can send')
          canTheySendToMe = true
        } else {
          console.log('❌ My setting is allies_only and we are NOT allies, they cannot send')
          canTheySendToMe = false
        }
      } else if (currentUserDmPerm === 'nobody') {
        console.log('❌ My setting blocks everyone, they cannot send')
        canTheySendToMe = false
      }

      console.log(`\n🔐 ===== DM PERMISSION CHECK RESULT =====`)
      console.log(`Can I send: ${canISendMessage}`)
      console.log(`Can they send to me: ${canTheySendToMe}`)
      console.log(`Lock reason: ${lockReason}`)
      console.log(`Setting state: canSendMessage=${canISendMessage}, messageLockReason=${lockReason}`)
      console.log(`🔐 ===== END =====\n`)
      
      setCanSendMessage(canISendMessage)
      setTheyCanSendToMe(canTheySendToMe)
      setMessageLockReason(lockReason)
      return canISendMessage
    } catch (err) {
      console.error('Error checking DM permissions:', err)
      setCanSendMessage(true)
      setTheyCanSendToMe(true)
      return true
    }
  }

  // Check if there's a block relationship between users
  const checkBlockStatus = async (currentUserId: string, otherUserId: string) => {
    try {
      // Check if I blocked them
      const { data: iBlockedThem } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', otherUserId)
        .maybeSingle()

      // Check if they blocked me
      const { data: theyBlockedMe } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', otherUserId)
        .eq('blocked_id', currentUserId)
        .maybeSingle()

      setIsBlocked(!!iBlockedThem)
      setIsBlockedByThem(!!theyBlockedMe)

      // If either user blocked the other, messaging should be disabled
      if (iBlockedThem || theyBlockedMe) {
        setCanSendMessage(false)
        if (iBlockedThem) {
          setMessageLockReason('you_blocked')
        } else if (theyBlockedMe) {
          setMessageLockReason('they_blocked')
        }
      }

      return { iBlockedThem: !!iBlockedThem, theyBlockedMe: !!theyBlockedMe }
    } catch (err) {
      console.error('Error checking block status:', err)
      return { iBlockedThem: false, theyBlockedMe: false }
    }
  }

  // Block a user
  const handleBlockUser = async () => {
    if (!currentUser || !userId || isBlockingUser) return

    setIsBlockingUser(true)
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUser.id,
          blocked_id: userId
        })

      if (error) {
        console.error('Error blocking user:', error)
        return
      }

      setIsBlocked(true)
      setCanSendMessage(false)
      setMessageLockReason('you_blocked')
      setShowUserMenu(false)
    } catch (err) {
      console.error('Error blocking user:', err)
    } finally {
      setIsBlockingUser(false)
    }
  }

  // Unblock a user
  const handleUnblockUser = async () => {
    if (!currentUser || !userId || isBlockingUser) return

    setIsBlockingUser(true)
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', userId)

      if (error) {
        console.error('Error unblocking user:', error)
        return
      }

      setIsBlocked(false)
      // Re-check DM permissions after unblocking (this also checks block status)
      await checkDmPermissions(userId, currentUser.id, [])
      setShowUserMenu(false)
    } catch (err) {
      console.error('Error unblocking user:', err)
    } finally {
      setIsBlockingUser(false)
    }
  }

  // Pin/Unpin a conversation
  const handlePinConversation = () => {
    if (!conversationId) return

    try {
      const stored = localStorage.getItem('pinnedConversations')
      const pinnedSet = new Set(stored ? JSON.parse(stored) : [])

      if (pinnedSet.has(conversationId)) {
        pinnedSet.delete(conversationId)
        setIsPinned(false)
      } else {
        pinnedSet.add(conversationId)
        setIsPinned(true)
      }

      localStorage.setItem('pinnedConversations', JSON.stringify(Array.from(pinnedSet)))
      setShowUserMenu(false)
      // Dispatch custom event to notify RightSidebar of changes
      window.dispatchEvent(new Event('pinnedConversationsChanged'))
    } catch (err) {
      console.error('Error pinning conversation:', err)
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMessageContent(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (e.target.value.trim()) {
      broadcastTyping(true)
    }

    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false)
      setIsOtherUserTyping(false)
    }, 2000)
  }

  // Helper function to format time based on user's timezone
  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Helper function to get date string for separator
  const getDateString = (createdAt: string) => {
    const date = new Date(createdAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    // Otherwise show the date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }

  // Helper function to check if date changed between two messages
  const isDateChanged = (msg1: Message, msg2: Message) => {
    const date1 = new Date(msg1.created_at).toDateString()
    const date2 = new Date(msg2.created_at).toDateString()
    return date1 !== date2
  }

  // Fetch shared post data when message has post_id
  const fetchSharedPostData = async (postId: string) => {
    if (sharedPostsData[postId]) return // Already cached

    try {
      const { data: post, error } = await supabase
        .from('posts')
        .select('id, user_id, title, description, media_url, created_at')
        .eq('id', postId)
        .single()

      if (error) {
        console.error('Error fetching shared post:', error)
        return
      }

      if (post) {
        // Fetch the post author's profile
        const { data: author } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', post.user_id)
          .single()

        setSharedPostsData(prev => ({
          ...prev,
          [postId]: { ...post, author }
        }))
      }
    } catch (err) {
      console.error('Error in fetchSharedPostData:', err)
    }
  }

  // Fetch shared post data for all messages with post_id or replied_to_post_id
  useEffect(() => {
    messages.forEach(message => {
      // Fetch data for direct shared posts
      if (message.post_id && !sharedPostsData[message.post_id]) {
        fetchSharedPostData(message.post_id)
      }
      // Also fetch data for cached replied-to posts
      if (message.replied_to_post_id && !sharedPostsData[message.replied_to_post_id]) {
        fetchSharedPostData(message.replied_to_post_id)
      }
    })
  }, [messages])

  // Load initial pinned state and subscribe to changes
  useEffect(() => {
    if (!conversationId) return

    const loadPinnedState = () => {
      try {
        const stored = localStorage.getItem('pinnedConversations')
        const pinnedSet = new Set(stored ? JSON.parse(stored) : [])
        setIsPinned(pinnedSet.has(conversationId))
      } catch (err) {
        console.error('Error loading pinned state:', err)
      }
    }

    loadPinnedState()

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pinnedConversations') {
        loadPinnedState()
      }
    }

    // Listen for custom event from same window
    const handlePinnedChanged = () => {
      loadPinnedState()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('pinnedConversationsChanged', handlePinnedChanged)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('pinnedConversationsChanged', handlePinnedChanged)
    }
  }, [conversationId])

  // Search messages
  const handleSearchMessages = () => {
    if (!searchQuery.trim()) {
      setFoundMessageIds([])
      setCurrentFoundIndex(-1)
      return
    }

    const query = searchQuery.toLowerCase()
    const found: string[] = []

    messages.forEach((message) => {
      if (message.content && message.content.toLowerCase().includes(query)) {
        found.push(message.id)
      }
    })

    setFoundMessageIds(found)
    setCurrentFoundIndex(found.length > 0 ? 0 : -1)

    // Scroll to first found message
    if (found.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`message-${found[0]}`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchMessages()
    }
  }

  // Render message with highlighted search results
  const renderHighlightedMessage = (content: string, messageId: string) => {
    if (!searchQuery.trim()) {
      return content
    }

    const query = searchQuery.toLowerCase()
    const contentLower = content.toLowerCase()
    const isFound = foundMessageIds.includes(messageId)
    const isCurrent = messageId === foundMessageIds[currentFoundIndex]

    if (!contentLower.includes(query)) {
      return content
    }

    const parts: (string | React.ReactNode)[] = []
    let lastIndex = 0
    const regex = new RegExp(`(${query})`, 'gi')
    let match

    while ((match = regex.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }

      // Add highlighted match
      parts.push(
        <span
          key={`${messageId}-${match.index}`}
          className={`font-semibold px-1 rounded ${
            isCurrent
              ? 'bg-yellow-400 text-black'
              : 'bg-yellow-200 text-gray-900'
          }`}
        >
          {match[0]}
        </span>
      )

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }

    return parts
  }

  const fetchAllies = async (userId: string) => {
    try {
      // Fetch all conversations for the current user
      const { data: conversationMembersData, error: convMembersError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userId)

      if (convMembersError) {
        console.error('Error fetching conversations:', convMembersError)
        return
      }

      if (!conversationMembersData || conversationMembersData.length === 0) {
        console.log('No conversations found')
        setAllies([])
        return
      }

      // For each conversation, find the other participant
      const conversationIds = conversationMembersData.map(cm => cm.conversation_id)
      const conversationsWithProfiles: Ally[] = []

      for (const convId of conversationIds) {
        const { data: members, error: membersError } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', convId)

        if (membersError) {
          console.error('Error fetching conversation members:', membersError)
          continue
        }

        // Find the other user (not the current user)
        const otherUserId = members?.find(m => m.user_id !== userId)?.user_id
        if (!otherUserId) continue

        // Fetch the profile of the other user
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .eq('id', otherUserId)
          .single()

        if (!profileError && profile) {
          conversationsWithProfiles.push({
            ally_id: otherUserId,
            profile: profile,
          })
        }
      }

      console.log('Fetched conversations:', conversationsWithProfiles)
      setAllies(conversationsWithProfiles)
    } catch (err) {
      console.error('Error fetching conversations:', err)
    }
  }

  // Initialize - get current user and conversation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        // Ensure current user has settings row
        try {
          const response = await fetch('/api/ensure-settings', { method: 'POST' })
          if (response.ok) {
            console.log('Ensured current user has settings')
          }
        } catch (err) {
          console.log('Settings initialization note:', err)
        }

        // Get current user session
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData?.session?.user) {
          router.push('/login')
          return
        }

        const user = sessionData.session.user
        setCurrentUser(user)

        // Fetch allies for sidebar
        await fetchAllies(user.id)

        // Fetch current user's profile
        const { data: currentProfileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (currentProfileData) {
          setCurrentUserProfile(currentProfileData)
        }

        // Fetch other user's profile
        const { data: otherProfileData, error: otherProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (otherProfileError) {
          console.error('Error fetching other user profile:', otherProfileError)
        }

        if (!otherProfileData) {
          console.error('Other user profile not found for ID:', userId)
          setLoading(false)
          return
        }
        setOtherUserProfile(otherProfileData)

        try {
          // Find existing conversation between the two users
          console.log('Looking for conversation between current user and:', userId)
          
          const { data: currentUserConversations, error: convError } = await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', user.id)

          if (convError) {
            console.error('Error fetching conversations:', convError)
            throw convError
          }

          console.log('Current user conversations:', currentUserConversations)

          let convId = null

          // Check if other user is in any of current user's conversations
          if (currentUserConversations && currentUserConversations.length > 0) {
            const convIds = currentUserConversations.map(cm => cm.conversation_id)
            console.log('Checking conv IDs:', convIds)
            
            // Query each conversation to find the one with the other user
            for (const cid of convIds) {
              const { data: members, error: memberError } = await supabase
                .from('conversation_members')
                .select('user_id')
                .eq('conversation_id', cid)

              if (memberError) {
                console.error('Error checking conversation members:', memberError)
                continue
              }

              console.log(`Members in conversation ${cid}:`, members)

              // Check if other user is in this conversation
              if (members && members.some(m => m.user_id === userId)) {
                convId = cid
                console.log('Found existing conversation:', convId)
                break
              } else if (members) {
                console.log(`Other user (${userId}) NOT found in conversation. Members:`, members.map(m => m.user_id))
                
                // If we're allies but not in the conversation together, add the missing member
                const { data: allies, error: allyError } = await supabase
                  .from('allies')
                  .select('*')
                  .or(`and(user_id.eq.${user.id},ally_id.eq.${userId}),and(user_id.eq.${userId},ally_id.eq.${user.id})`)
                  .maybeSingle()

                if (allies && !allyError) {
                  console.log('Found ally relationship, adding missing member to conversation')
                  // Add the current user to the conversation if not already there
                  const { error: addError } = await supabase
                    .from('conversation_members')
                    .insert({
                      conversation_id: cid,
                      user_id: userId,
                      created_at: new Date().toISOString(),
                    })

                  if (!addError) {
                    convId = cid
                    console.log('Successfully added missing member to conversation')
                    break
                  }
                }
              }
            }
          }

          // If no conversation exists, show error message
          if (!convId) {
            console.error('No conversation found with this user. Accept their ally request first.')
            setAccessDenied(true)
            setLoading(false)
            return
          }

          // Verify current user is actually a member of this conversation (authorization check)
          const { data: memberCheck, error: memberCheckError } = await supabase
            .from('conversation_members')
            .select('id')
            .eq('conversation_id', convId)
            .eq('user_id', user.id)
            .maybeSingle()

          if (!memberCheck || memberCheckError) {
            console.error('❌ SECURITY: User is not a member of this conversation')
            setAccessDenied(true)
            setLoading(false)
            return
          }

          setConversationId(convId)
          console.log('Final conversation ID:', convId)

          // Unhide this conversation from the sidebar if it was hidden
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('hiddenConversations')
            if (stored) {
              try {
                const hiddenSet = new Set(JSON.parse(stored))
                if (hiddenSet.has(convId)) {
                  hiddenSet.delete(convId)
                  localStorage.setItem('hiddenConversations', JSON.stringify(Array.from(hiddenSet)))
                }
              } catch (err) {
                console.error('Error unhiding conversation:', err)
              }
            }
          }

          // Fetch messages (latest 50 for initial load)
          const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false }) // Descending to get newest first
            .range(0, 49) // Load last 50 messages

          if (messagesError) {
            console.error('Error fetching messages:', messagesError)
          } else {
            console.log('Messages fetched:', messagesData?.length || 0)
            if (messagesData) {
              // Reverse to get ascending order (oldest to newest)
              setMessages(messagesData.reverse())
              // Check if there are more messages
              setHasMoreMessages(messagesData.length === 50)
              setIsInitialLoad(false) // Mark initial load as complete
            }
          }

          // Mark conversation as read
          const now = new Date().toISOString()
          console.log('🔵 Marking conversation as read:', { convId, userId: user.id, timestamp: now })
          
          const { error: readError, data: readData } = await supabase
            .from('conversation_members')
            .update({ last_read_at: now })
            .eq('conversation_id', convId)
            .eq('user_id', user.id)
            .select()

          if (readError) {
            console.error('Error marking conversation as read:', readError)
            console.error('Error message:', readError.message)
            console.error('Error code:', readError.code)
            console.error('Error details:', readError.details)
          } else {
            console.log('✅ Conversation marked as read, updated rows:', readData?.length || 0)
          }

          // Check DM permissions after messages are fetched (this also checks block status)
          const messagesToCheck = messagesData || []
          await checkDmPermissions(userId, user.id, messagesToCheck)

          setLoading(false)

          // Subscribe to real-time message updates
          console.log('🔌 Setting up real-time subscription for conversation:', convId)
          
          const channel = supabase
            .channel(`conv-${convId}`, {
              config: {
                broadcast: { self: true }
              }
            })
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
              },
              (payload: any) => {
                // Only process messages for this conversation
                if (payload.new.conversation_id !== convId) {
                  return
                }
                
                console.log('📨 Real-time message received:', payload.new)
                setMessages((prevMessages) => {
                  const messageExists = prevMessages.some(m => m.id === payload.new.id)
                  if (messageExists) {
                    console.log('Message already exists, skipping duplicate')
                    return prevMessages
                  }
                  
                  console.log('✅ Adding message to conversation in real-time')
                  
                  // Unlock conversation when first message arrives
                  if (prevMessages.length === 0) {
                    console.log('First message received - unlocking conversation')
                    setCanSendMessage(true)
                    setTheyCanSendToMe(true)
                  }
                  
                  return [...prevMessages, payload.new]
                })
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'DELETE',
                schema: 'public',
                table: 'messages',
              },
              (payload: any) => {
                // Only process deletes for this conversation
                if (payload.old.conversation_id !== convId) {
                  return
                }
                
                console.log('🗑️ ===== REAL-TIME DELETE EVENT RECEIVED =====')
                console.log('Deleted message ID:', payload.old?.id)
                
                if (!payload.old?.id) {
                  console.error('❌ ERROR: No message ID in delete payload')
                  return
                }
                
                setMessages((prevMessages) => {
                  const messageToDelete = prevMessages.find(m => m.id === payload.old.id)
                  
                  if (!messageToDelete) {
                    console.warn(`⚠️ Message ${payload.old.id} not found in local state`)
                    return prevMessages
                  }
                  
                  const filtered = prevMessages.filter(m => m.id !== payload.old.id)
                  console.log(`✅ DELETED: Removed message ${payload.old.id}`)
                  console.log(`Message content was: "${messageToDelete.content}"`)
                  console.log(`Messages count: ${prevMessages.length} → ${filtered.length}`)
                  return filtered
                })
              }
            )
            .on('broadcast', { event: 'typing' }, (payload: any) => {
              console.log('⌨️ Typing event received:', payload.payload)
              // Only process typing events from the other user
              if (payload.payload.user_id === user.id) {
                console.log('Ignoring own typing broadcast')
                return
              }
              setIsOtherUserTyping(payload.payload.is_typing)
              setTypingUserName(payload.payload.display_name || '')
            })
            .on('broadcast', { event: 'message_deleted' }, (payload: any) => {
              console.log('📢 [BROADCAST] Message deletion broadcast received:', payload.payload)
              // Only process deletion events from the other user
              if (payload.payload.deleted_by === user.id) {
                console.log('Ignoring own deletion broadcast')
                return
              }
              
              console.log('🔄 [BROADCAST] Fetching updated messages due to deletion event')
              // Fetch fresh messages to ensure sync with database
              supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', convId)
                .order('created_at', { ascending: true })
                .then(({ data: freshMessages, error }) => {
                  if (error) {
                    console.error('❌ [BROADCAST] Error fetching messages:', error)
                    return
                  }
                  if (freshMessages) {
                    console.log(`✅ [BROADCAST] Messages refreshed from deletion event: ${freshMessages.length} messages`)
                    setMessages(freshMessages)
                  }
                })
            })
            .subscribe((status: any) => {
              console.log('📡 ===== CHANNEL SUBSCRIPTION STATUS =====')
              console.log('Status:', status)
              
              if (status === 'SUBSCRIBED') {
                subscriptionErrorCountRef.current = 0 // Reset error count on successful subscription
                console.log('✅ Real-time subscription ACTIVE for conversation:', convId)
                console.log('✅ Will now receive DELETE events in real-time')
                console.log('✅ Other users will see your deletions immediately')
              } else if (status === 'CHANNEL_ERROR') {
                subscriptionErrorCountRef.current += 1
                // Don't log - it's a temporary network issue and polling will handle it
              } else if (status === 'TIMED_OUT') {
                subscriptionErrorCountRef.current += 1
                // Don't log - it's a temporary issue and polling will handle it
              }
            })

          channelRef.current = channel
        } catch (err) {
          console.error('Error in conversation initialization:', err)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error initializing conversation:', err)
        setLoading(false)
      }
    }

    if (userId) {
      initializeConversation()
    }

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up real-time subscription')
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (channelRef.current) {
        try {
          console.log('Unsubscribing from channel:', channelRef.current)
          channelRef.current.unsubscribe()
          supabase.removeChannel(channelRef.current)
          console.log('✅ Channel properly removed')
        } catch (err) {
          console.error('Error cleaning up channel:', err)
        }
        channelRef.current = null
      }
    }
  }, [userId])

  // Periodically check DM permissions to detect if ally status changes
  useEffect(() => {
    if (!conversationId || !currentUser || !userId) return

    console.log('🔔 Setting up permission check interval')
    
    const permissionCheckInterval = setInterval(async () => {
      console.log('🔄 Checking DM permissions (interval check)...')
      console.log('Current user:', currentUser.id)
      console.log('Other user:', userId)
      console.log('Conversation ID:', conversationId)
      await checkDmPermissions(userId, currentUser.id, [])
    }, 2000) // Check every 2 seconds

    return () => {
      console.log('🧹 Cleaning up permission check interval')
      clearInterval(permissionCheckInterval)
    }
  }, [userId, currentUser?.id, conversationId])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const [hasScrolledOnLoad, setHasScrolledOnLoad] = useState(false)
  
  // Jump to latest message only on first load (not when loading more)
  useLayoutEffect(() => {
    if (!loading && !hasScrolledOnLoad && !isLoadingMoreRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      setHasScrolledOnLoad(true)
    }
  }, [loading, hasScrolledOnLoad])

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMediaFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const loadMoreMessages = async () => {
    if (!conversationId || isLoadingMore || !hasMoreMessages) return

    try {
      setIsLoadingMore(true)
      isLoadingMoreRef.current = true
      
      // Save current scroll position and height before loading
      const container = messagesContainerRef.current
      const previousScrollHeight = container?.scrollHeight || 0
      
      // Fetch older messages (before the first loaded message)
      const firstMessageTime = messages[0]?.created_at
      if (!firstMessageTime) return

      const { data: olderMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', firstMessageTime) // Get messages before the first one
        .order('created_at', { ascending: true })
        .range(0, 49) // Load 50 more messages

      if (error) {
        console.error('Error loading more messages:', error)
        return
      }

      if (olderMessages && olderMessages.length > 0) {
        // Prepend older messages to the beginning
        setMessages([...olderMessages, ...messages])
        // Check if there are even more messages
        setHasMoreMessages(olderMessages.length === 50)
        
        // Restore scroll position after messages are prepended
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - previousScrollHeight
          }
          isLoadingMoreRef.current = false
        })
      } else {
        // No more messages to load
        setHasMoreMessages(false)
        isLoadingMoreRef.current = false
      }
    } catch (err) {
      console.error('Error loading more messages:', err)
      isLoadingMoreRef.current = false
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Scroll to a specific message, loading more messages if needed
  const scrollToMessage = async (messageId: string) => {
    if (isScrollingToMessage) return
    setIsScrollingToMessage(true)
    
    // Try to find the message in the current messages array
    let targetMessage = messages.find(m => m.id === messageId)
    
    // If message is not loaded, we need to load more messages until we find it
    if (!targetMessage && hasMoreMessages && conversationId) {
      // Keep loading more messages until we find the target
      let attempts = 0
      const maxAttempts = 10 // Limit attempts to prevent infinite loops
      
      while (!targetMessage && hasMoreMessages && attempts < maxAttempts) {
        attempts++
        
        // Get the oldest loaded message
        const oldestMessage = messages[0]
        if (!oldestMessage) break
        
        // Fetch older messages
        const { data: olderMessages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .lt('created_at', oldestMessage.created_at)
          .order('created_at', { ascending: true })
          .range(0, 49)
        
        if (error || !olderMessages || olderMessages.length === 0) {
          setHasMoreMessages(false)
          break
        }
        
        // Update messages state
        const newMessages = [...olderMessages, ...messages]
        setMessages(newMessages)
        
        // Check if there are more messages
        if (olderMessages.length < 50) {
          setHasMoreMessages(false)
        }
        
        // Check if target message is now loaded
        targetMessage = newMessages.find(m => m.id === messageId)
        
        // Wait for state to update
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Now try to scroll to the message
    setTimeout(() => {
      const element = document.querySelector(`[data-message-id="${messageId}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Highlight the message temporarily
        setHighlightedMessageId(messageId)
        setTimeout(() => {
          setHighlightedMessageId(null)
        }, 2000)
      }
      setIsScrollingToMessage(false)
    }, 150)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageContent.trim() && !mediaFile) return
    if (!conversationId || !currentUser) return

    // Check if user can send messages
    if (!canSendMessage) {
      alert('You cannot send messages to this user due to their privacy settings.')
      return
    }

    try {
      setSending(true)
      let mediaUrl = null

      // Upload media if present
      if (mediaFile) {
        let fileToUpload = mediaFile
        
        // Compress media if it's an image and needed
        if (mediaFile.type.startsWith('image/') && shouldCompress(mediaFile)) {
          try {
            const compressedBlob = await compressPostMedia(mediaFile)
            fileToUpload = new File([compressedBlob], mediaFile.name, { type: compressedBlob.type })
          } catch (err) {
            console.warn('Compression failed, uploading original:', err)
            // Continue with original file if compression fails
          }
        }

        const timestamp = Date.now()
        // Sanitize filename by removing special characters and non-ASCII characters
        const sanitizedFileName = fileToUpload.name
          .replace(/[^\w\s.-]/g, '') // Remove special characters except dots, dashes, underscores
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .trim()
        const fileName = `${currentUser.id}/${timestamp}-${sanitizedFileName}`

        const { error: uploadError } = await supabase.storage
          .from('message-media')
          .upload(fileName, fileToUpload)

        if (uploadError) {
          console.error('Error uploading media:', uploadError)
          alert('Failed to upload media. Please try again.')
          setSending(false)
          return
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('message-media')
          .getPublicUrl(fileName)

        mediaUrl = publicUrl
      }

      // Send message
      // Prepare reply cache data if replying to a message
      let replyCacheData: {
        replied_to_content?: string | null
        replied_to_media_url?: string | null
        replied_to_post_id?: string | null
        replied_to_sender_name?: string | null
      } = {}
      
      if (repliedToMessage) {
        const isRepliedCurrentUser = repliedToMessage.sender_id === currentUser.id
        const repliedSender = isRepliedCurrentUser ? currentUserProfile : otherUserProfile
        
        replyCacheData = {
          replied_to_content: repliedToMessage.content || null,
          replied_to_media_url: repliedToMessage.media_url || null,
          replied_to_post_id: repliedToMessage.post_id || null,
          replied_to_sender_name: repliedSender?.display_name || repliedSender?.username || null,
        }
      }
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: currentUser.id,
            content: messageContent.trim(),
            media_url: mediaUrl,
            replied_to_message_id: repliedToMessage?.id || null,
            ...replyCacheData,
          },
        ])

      if (messageError) {
        console.error('Error sending message:', messageError)
        alert('Failed to send message. Please try again.')
        return
      }

      // Reset form
      setMessageContent('')
      setMediaFile(null)
      setMediaPreview(null)
      setRepliedToMessage(null)
      
      // Reset textarea height to initial state
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }

      // Refresh messages
      const { data: updatedMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (updatedMessages) {
        setMessages(updatedMessages)
      }
    } catch (err) {
      console.error('Error sending message:', err)
      alert('An error occurred while sending the message.')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      console.log('🗑️ [DELETE] Starting message deletion:', messageId)
      console.log('🗑️ [DELETE] Conversation ID:', conversationId)
      
      // First, remove from local state for immediate UI feedback
      setMessages((prevMessages) => {
        const updated = prevMessages.filter(msg => msg.id !== messageId)
        console.log(`🗑️ [DELETE] Local state updated: ${prevMessages.length} → ${updated.length} messages`)
        return updated
      })

      // Delete from database
      const { error, count } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (error) {
        console.error('❌ [DELETE] Database error:', error)
        alert('Failed to delete message: ' + error.message)
        // Refresh messages to restore if delete failed
        const { data: refreshedMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
        if (refreshedMessages) {
          setMessages(refreshedMessages)
        }
        return
      }

      console.log(`✅ [DELETE] Message deleted from database. Rows affected: ${count}`)

      // Broadcast deletion event to trigger refresh for other user
      if (conversationId && channelRef.current) {
        console.log('📢 [DELETE] Broadcasting deletion event to other user')
        channelRef.current.send({
          type: 'broadcast',
          event: 'message_deleted',
          payload: {
            deleted_message_id: messageId,
            conversation_id: conversationId,
            deleted_by: currentUser?.id,
            timestamp: new Date().toISOString(),
          }
        })
      }

      // Fetch fresh message list to ensure sync
      console.log('🔄 [DELETE] Fetching updated message list to ensure sync')
      const { data: freshMessages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (fetchError) {
        console.error('❌ [DELETE] Error fetching updated messages:', fetchError)
        return
      }

      if (freshMessages) {
        console.log(`✅ [DELETE] Refreshed messages: ${freshMessages.length} total`)
        setMessages(freshMessages)
      }
    } catch (err) {
      console.error('❌ [DELETE] Unexpected error:', err)
      alert('An error occurred while deleting the message.')
      // Refresh messages on error
      if (conversationId) {
        const { data: refreshedMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
        if (refreshedMessages) {
          setMessages(refreshedMessages)
        }
      }
    }
  }

  if (loading) {
    return <GlobalLoading />
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-gray-400 text-sm mb-6">You do not have access to this conversation.</p>
          <button
            onClick={() => router.push('/hub')}
            className="bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2 px-8 rounded-lg transition-all duration-200"
          >
            Back to Hub
          </button>
        </div>
      </div>
    )
  }

  if (!otherUserProfile) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg font-semibold mb-4">User not found</p>
          <button
            onClick={() => router.push('/hub')}
            className="bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2 px-8 rounded-lg transition-all duration-200"
          >
            Back to Hub
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#181818] text-white">
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
          {currentUserProfile && (
            <div className="px-2 mb-8">
              <div className="flex items-start gap-3">
                <AvatarWithFrame
                  src={currentUserProfile.avatar_url}
                  alt={currentUserProfile.username}
                  equippedFrame={currentUserProfile.equipped_frame}
                  size="lg"
                  frameScale={1.25}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate text-sm">{currentUserProfile.display_name || currentUserProfile.username}</h3>
                  <p className="text-gray-500 text-xs truncate">@{currentUserProfile.username}</p>
                </div>
                <div className="flex items-center gap-2 bg-[#252525] rounded-lg px-3 py-2 flex-shrink-0">
                  <img 
                    src="/Visuals/ClannectCoin.png"
                    alt="Cloin"
                    className="w-5 h-5 pointer-events-none select-none"
                    draggable={false}
                  />
                  <span className="text-white font-semibold text-sm">{currentUserProfile.cloin || 0}</span>
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
                { id: 'allies', label: 'Allies', icon: Users },
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'collections', label: 'Collections', icon: Bookmark },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'hub') {
                        router.push('/hub')
                      } else if (item.id === 'post') {
                        router.push('/post')
                      } else if (item.id === 'shop') {
                        router.push('/shop')
                      } else if (item.id === 'allies') {
                        router.push('/allies')
                      } else if (item.id === 'profile') {
                        router.push('/profile')
                      } else if (item.id === 'collections') {
                        router.push('/collections')
                      } else if (item.id === 'settings') {
                        router.push('/settings')
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 text-gray-400 hover:text-white hover:bg-[#252525]`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Logout Button */}
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

        {/* Main Content - Conversation */}
        <div className="flex-1 flex flex-col bg-[#181818]">
          {/* Header */}
          <div className="bg-[#1f1f1f] border-b border-gray-800 p-4 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            
            {otherUserProfile && (
              <div
                onClick={() => router.push(`/profile/${otherUserProfile.username}`)}
                className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <AvatarWithFrame
                  src={otherUserProfile.avatar_url}
                  alt={otherUserProfile.username}
                  equippedFrame={otherUserProfile.equipped_frame}
                  size="md"
                  frameScale={1.25}
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold text-base">{otherUserProfile.display_name || otherUserProfile.username}</h2>
                  <p className="text-gray-400 text-xs">@{otherUserProfile.username}</p>
                </div>
              </div>
            )}

            {/* Message Search Bar */}
            {otherUserProfile && (
              <div className="flex items-center gap-2 bg-[#252525] rounded-lg px-3 py-2 border border-gray-700 hover:border-gray-600 transition-colors">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder="Search messages..."
                  className="bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none w-32"
                />
                <button
                  onClick={handleSearchMessages}
                  disabled={!searchQuery.trim()}
                  className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs"
                >
                  Search
                </button>
                {foundMessageIds.length > 0 && (
                  <span className="text-gray-500 text-xs ml-1">
                    {currentFoundIndex + 1}/{foundMessageIds.length}
                  </span>
                )}
              </div>
            )}

            {/* Three dots menu */}
            {otherUserProfile && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  <MoreVertical size={20} />
                </button>

                {/* Dropdown menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#252525] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* Pin Conversation */}
                    <button
                      onClick={handlePinConversation}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left"
                    >
                      <Pin size={18} style={{ color: isPinned ? '#fe4133' : 'inherit' }} />
                      <span>{isPinned ? 'Unpin Conversation' : 'Pin Conversation'}</span>
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-700"></div>

                    {isBlocked ? (
                      <button
                        onClick={handleUnblockUser}
                        disabled={isBlockingUser}
                        className="w-full flex items-center gap-3 px-4 py-3 text-green-400 hover:bg-[#2a2a2a] transition-colors text-left disabled:opacity-50"
                      >
                        <Ban size={18} />
                        <span>{isBlockingUser ? 'Unblocking...' : 'Unblock User'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowBlockConfirmation(true)}
                        disabled={isBlockingUser}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] transition-colors text-left disabled:opacity-50"
                      >
                        <Ban size={18} />
                        <span>{isBlockingUser ? 'Blocking...' : 'Block User'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Block Confirmation Modal */}
          {showBlockConfirmation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-[#252525] border border-gray-700 rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                <h2 className="text-white font-semibold text-lg mb-3">Block User?</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Are you sure you want to block <span className="font-semibold text-white">{otherUserProfile?.display_name || otherUserProfile?.username}</span>? You won't be able to message each other.
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
                    onClick={() => {
                      handleBlockUser()
                      setShowBlockConfirmation(false)
                    }}
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

          {/* Messages or Error State */}
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 text-lg mb-2">No conversation yet</p>
                <p className="text-gray-500 text-sm">Accept this user's ally request to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {hasMoreMessages && messages.length > 0 && (
                  <div className="flex justify-center py-2">
                    <button
                      onClick={loadMoreMessages}
                      disabled={isLoadingMore}
                      className="text-sm text-gray-400 hover:text-white bg-[#252525] hover:bg-[#2a2a2a] px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingMore ? 'Loading...' : 'Load More...'}
                    </button>
                  </div>
                )}
                {messages.length === 0 ? (
                  !theyCanSendToMe ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-yellow-400 font-semibold mb-2">Unlock This Conversation</p>
                        <p className="text-yellow-300 text-sm">
                          This user can not send you direct messages due to your privacy settings. You must send the first message to let them send a message to you.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">No messages yet. Start a conversation!</p>
                    </div>
                  )
                ) : (
                  messages.map((message, index) => {
                    // Check if this is the first message or if the previous message is from a different sender
                    const isFirstInSequence = index === 0 || messages[index - 1].sender_id !== message.sender_id
                    const isCurrentUser = message.sender_id === currentUser?.id
                    const senderProfile = isCurrentUser ? currentUserProfile : otherUserProfile
                    // Check if date changed from previous message
                    const showDateSeparator = index === 0 || isDateChanged(messages[index - 1], message)

                    return (
                      <div key={message.id} data-message-id={message.id}>
                        {/* Date Separator */}
                        {showDateSeparator && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-gray-700"></div>
                            <p className="text-xs text-gray-500 font-medium">{getDateString(message.created_at)}</p>
                            <div className="flex-1 h-px bg-gray-700"></div>
                          </div>
                        )}

                        {/* Message */}
                        <div
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} gap-3 ${isCurrentUser ? 'group' : ''} ${highlightedMessageId === message.id ? 'animate-pulse' : ''}`}
                          onMouseEnter={() => setHoveredMessageId(message.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} ${isCurrentUser ? 'group-hover:translate-x-1 transition-transform' : ''}`}>
                          {/* Profile Picture and Display Name - horizontally centered together */}
                          {isFirstInSequence && senderProfile ? (
                            <div
                              onClick={() => !isCurrentUser && router.push(`/profile/${senderProfile.username}`)}
                              className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 mb-2 ${!isCurrentUser ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            >
                              <div>
                                <AvatarWithFrame
                                  src={senderProfile.avatar_url}
                                  alt={senderProfile.username}
                                  equippedFrame={senderProfile.equipped_frame}
                                  size="sm"
                                  frameScale={1.25}
                                />
                              </div>
                              <p className="text-base text-white font-semibold">
                                {senderProfile.display_name || senderProfile.username}
                              </p>
                            </div>
                          ) : null}

                          {/* Message Bubble */}
                          <div
                            className={`rounded-lg p-3 max-w-xs transition-all ${
                              isCurrentUser
                                ? 'bg-[#ff4234] text-white'
                                : 'bg-[#252525] text-white'
                            } ${highlightedMessageId === message.id ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#1a1a1a]' : ''}`}
                          >
                            {/* Replied-to message preview */}
                            {(message.replied_to_message_id || message.replied_to_sender_name) && (
                              <div 
                                className={`mb-2 pb-2 border-b ${isCurrentUser ? 'border-red-600/50' : 'border-gray-600/50'} ${
                                  messages.find(m => m.id === message.replied_to_message_id) 
                                    ? 'cursor-pointer hover:opacity-80 transition-opacity'
                                    : 'cursor-default opacity-60'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Only scroll if message exists
                                  if (message.replied_to_message_id && messages.find(m => m.id === message.replied_to_message_id)) {
                                    scrollToMessage(message.replied_to_message_id!)
                                  }
                                }}
                              >
                                {(() => {
                                  const repliedMsg = messages.find(m => m.id === message.replied_to_message_id)
                                  
                                  // Check if message was deleted (no live data but has cached sender name)
                                  const isMessageDeleted = !repliedMsg && message.replied_to_sender_name
                                  
                                  if (isMessageDeleted) {
                                    return (
                                      <div className="text-xs opacity-75">
                                        <p className={`font-semibold mb-1 ${isCurrentUser ? 'text-red-100' : 'text-gray-400'}`}>
                                          This message was deleted
                                        </p>
                                      </div>
                                    )
                                  }
                                  
                                  // Use cached data or live data
                                  const senderName = repliedMsg 
                                    ? (repliedMsg.sender_id === currentUser?.id 
                                        ? (currentUserProfile?.display_name || currentUserProfile?.username)
                                        : (otherUserProfile?.display_name || otherUserProfile?.username))
                                    : message.replied_to_sender_name
                                  
                                  const replyContent = repliedMsg?.content || message.replied_to_content
                                  const replyMediaUrl = repliedMsg?.media_url || message.replied_to_media_url
                                  const replyPostId = repliedMsg?.post_id || message.replied_to_post_id
                                  
                                  // Check if replied message is a shared post
                                  if (replyPostId && sharedPostsData[replyPostId]) {
                                    const postData = sharedPostsData[replyPostId]
                                    return (
                                      <div className="text-xs opacity-90">
                                        <p className={`font-semibold mb-1 ${isCurrentUser ? 'text-red-100' : 'text-gray-300'}`}>
                                          {senderName || 'Unknown'}
                                        </p>
                                        {/* Post title */}
                                        {postData.title && (
                                          <p className={`font-semibold mb-1 truncate ${isCurrentUser ? 'text-white' : 'text-gray-200'}`}>
                                            {postData.title}
                                          </p>
                                        )}
                                        {/* Post description */}
                                        {postData.description && (
                                          <p className={`line-clamp-4 mb-1 ${isCurrentUser ? 'text-red-50' : 'text-gray-400'}`}>
                                            {postData.description}
                                          </p>
                                        )}
                                        {/* Post media preview */}
                                        {postData.media_url && (
                                          <div className="mt-1 rounded overflow-hidden max-h-20">
                                            {postData.media_url.includes('.mp4') || 
                                             postData.media_url.includes('.webm') ||
                                             postData.media_url.includes('.mov') ? (
                                              <video 
                                                src={postData.media_url} 
                                                className="w-full h-20 object-cover rounded"
                                              />
                                            ) : (
                                              <img 
                                                src={postData.media_url} 
                                                alt="Post media"
                                                className="w-full h-20 object-cover rounded"
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }
                                  
                                  // Regular message reply (use cached data if original not loaded)
                                  // Show media preview if it's an image/video
                                  if (replyMediaUrl) {
                                    const isVideo = replyMediaUrl.includes('.mp4') || 
                                                    replyMediaUrl.includes('.webm') || 
                                                    replyMediaUrl.includes('.mov')
                                    return (
                                      <div className="text-xs opacity-75">
                                        <p className={`font-semibold mb-1 ${isCurrentUser ? 'text-red-100' : 'text-gray-300'}`}>
                                          {senderName || 'Unknown'}
                                        </p>
                                        {replyContent && (
                                          <p className={`truncate mb-1 ${isCurrentUser ? 'text-red-50' : 'text-gray-400'}`}>
                                            {replyContent}
                                          </p>
                                        )}
                                        <div className="mt-1 rounded overflow-hidden max-h-16">
                                          {isVideo ? (
                                            <video 
                                              src={replyMediaUrl} 
                                              className="w-full h-16 object-cover rounded"
                                            />
                                          ) : (
                                            <img 
                                              src={replyMediaUrl} 
                                              alt="Reply media"
                                              className="w-full h-16 object-cover rounded"
                                            />
                                          )}
                                        </div>
                                      </div>
                                    )
                                  }
                                  
                                  // Text-only reply
                                  return (
                                    <div className="text-xs opacity-75">
                                      <p className={`font-semibold mb-1 ${isCurrentUser ? 'text-red-100' : 'text-gray-300'}`}>
                                        {senderName || 'Unknown'}
                                      </p>
                                      <p className={`truncate break-words whitespace-pre-wrap line-clamp-4 ${isCurrentUser ? 'text-red-50' : 'text-gray-400'}`}>
                                        {replyContent || (replyPostId ? '[Shared Post]' : '[Message]')}
                                      </p>
                                    </div>
                                  )
                                })()}
                              </div>
                            )}
                            
                            {message.media_url && (
                              <div className="mb-2 cursor-pointer" onClick={() => setFullscreenImage(message.media_url)}>
                                <img
                                  src={message.media_url}
                                  alt="message media"
                                  className="rounded-lg max-w-full h-auto object-cover hover:opacity-80 transition-opacity"
                                  style={{ maxHeight: '300px' }}
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    console.error('Image failed to load:', message.media_url)
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            )}

                            {/* Shared Post Display */}
                            {message.post_id && (
                              <>
                                {!sharedPostsData[message.post_id] && (
                                  <div className="mb-2 border border-gray-700 rounded-lg p-3 bg-[#1a1a1a] animate-pulse">
                                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                                  </div>
                                )}
                                {sharedPostsData[message.post_id] && (
                                  <div 
                                    className="mb-2 border border-gray-700 rounded-lg p-3 bg-[#1a1a1a] hover:bg-[#1f1f1f] transition-colors cursor-pointer"
                                    onClick={() => {
                                      console.log('[Navigate] Clicking shared post, post_id:', message.post_id)
                                      router.push(`/hub/post/${message.post_id}`)
                                    }}
                                  >
                                    {/* Post Author Info */}
                                    <div className="flex items-center gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                                      {sharedPostsData[message.post_id].author?.avatar_url ? (
                                        <img
                                          src={sharedPostsData[message.post_id].author.avatar_url}
                                          alt={sharedPostsData[message.post_id].author?.username}
                                          className="w-8 h-8 rounded-full object-cover border border-gray-700"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center border border-gray-700">
                                          <span className="text-xs font-bold text-white">?</span>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-white text-sm font-semibold">
                                          {sharedPostsData[message.post_id].author?.display_name || sharedPostsData[message.post_id].author?.username}
                                        </p>
                                        <p className="text-gray-500 text-xs">@{sharedPostsData[message.post_id].author?.username}</p>
                                      </div>
                                    </div>

                                    {/* Post Content */}
                                    {sharedPostsData[message.post_id].title && (
                                      <p className="text-white text-sm font-semibold mb-1">
                                        {sharedPostsData[message.post_id].title}
                                      </p>
                                    )}
                                    {sharedPostsData[message.post_id].description && (
                                      <p className="text-gray-400 text-sm mb-2 line-clamp-5">
                                        {sharedPostsData[message.post_id].description}
                                      </p>
                                    )}

                                    {/* Post Media - Full Display */}
                                    {sharedPostsData[message.post_id].media_url && (
                                      <div className="mb-2 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-black" onClick={(e) => e.stopPropagation()}>
                                        {sharedPostsData[message.post_id].media_url.includes('.mp4') || 
                                         sharedPostsData[message.post_id].media_url.includes('.webm') ||
                                         sharedPostsData[message.post_id].media_url.includes('.mov') ? (
                                          <video
                                            src={sharedPostsData[message.post_id].media_url}
                                            className="w-full h-auto max-h-96 object-cover"
                                            controls
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        ) : (
                                          <img
                                            src={message.post_id ? sharedPostsData[message.post_id]?.media_url : ''}
                                            alt="shared post media"
                                            className="w-full h-auto object-cover max-h-96"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (message.post_id) {
                                                setFullscreenImage(sharedPostsData[message.post_id]?.media_url || '')
                                              }
                                            }}
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}

                            {message.content && (
                              <p 
                                id={`message-${message.id}`}
                                className={`break-words whitespace-pre-wrap transition-colors ${
                                  foundMessageIds.includes(message.id) ? 'bg-opacity-20 bg-yellow-400 px-2 py-1 rounded' : ''
                                }`}
                              >
                                {renderHighlightedMessage(message.content, message.id)}
                              </p>
                            )}
                          </div>

                          {/* Timestamp - show below message */}
                          <p className="text-xs text-gray-500 mt-1 px-3">
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setRepliedToMessage(message)}
                            className={`flex-shrink-0 text-gray-400 hover:text-[#ff4234] transition-all p-1 h-fit ${
                              hoveredMessageId === message.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
                            }`}
                            title="Reply to message"
                          >
                            <Reply className="w-5 h-5" />
                          </button>

                          {isCurrentUser && (
                            <button
                              onClick={() => {
                                console.log('Delete button clicked for message:', message.id)
                                console.log('Current user ID:', currentUser?.id)
                                console.log('Conversation ID:', conversationId)
                                handleDeleteMessage(message.id)
                              }}
                              className={`flex-shrink-0 text-gray-400 hover:text-[#ff4234] transition-all p-1 h-fit ${
                                hoveredMessageId === message.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
                              }`}
                              title="Delete message"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} tabIndex={-1} />
              </div>

              {/* Fullscreen Image Modal */}
              {fullscreenImage && (
                <div
                  className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                  onClick={() => setFullscreenImage(null)}
                >
                  <div className="relative max-w-4xl max-h-screen flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <img
                      src={fullscreenImage}
                      alt="fullscreen"
                      className="max-w-full max-h-full object-contain"
                      crossOrigin="anonymous"
                    />
                    <button
                      onClick={() => setFullscreenImage(null)}
                      className="absolute top-4 right-4 bg-[#ff4234] hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                      title="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Typing Indicator */}
              {isOtherUserTyping && (
                <div className="px-4 py-2 text-sm text-gray-400 italic">
                  {typingUserName} is typing...
                </div>
              )}

              {/* Message Input */}
              <div className="bg-[#1f1f1f] border-t border-gray-800 p-4">
                {!canSendMessage ? (
                  // I can't send to this user - show appropriate message
                  <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 text-center">
                    {messageLockReason === 'you_blocked' ? (
                      <p className="text-red-400 font-semibold">You have blocked this user. Unblock them to send messages.</p>
                    ) : messageLockReason === 'they_blocked' ? (
                      <p className="text-red-400 font-semibold">You cannot send messages to this user.</p>
                    ) : messageLockReason === 'my_setting' ? (
                      <p className="text-red-400 font-semibold">Due to your privacy settings, you must add this user as an ally to start chatting with them.</p>
                    ) : (
                      <p className="text-red-400 font-semibold">Due to their privacy settings, you must add this user as an ally to start chatting with them.</p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Reply Preview */}
                    {repliedToMessage && (
                      <div className="mb-3 bg-[#252525] border-l-4 border-[#ff4234] rounded-lg p-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 mb-1">Replying to</p>
                          <div className="flex items-start gap-2 mb-2">
                            {messages.find(m => m.id === repliedToMessage.id)?.sender_id === currentUser?.id ? (
                              <span className="text-sm text-white font-semibold">You</span>
                            ) : (
                              <span className="text-sm text-white font-semibold">
                                {otherUserProfile?.display_name || otherUserProfile?.username}
                              </span>
                            )}
                          </div>
                          
                          {/* Show post content if this is a shared post reply */}
                          {repliedToMessage.post_id && sharedPostsData[repliedToMessage.post_id] ? (
                            <div className="space-y-2">
                              {/* Post title and description */}
                              {sharedPostsData[repliedToMessage.post_id].title && (
                                <p className="text-sm text-gray-300 font-semibold truncate">
                                  {sharedPostsData[repliedToMessage.post_id].title}
                                </p>
                              )}
                              {sharedPostsData[repliedToMessage.post_id].description && (
                                <p className="text-sm text-gray-400 line-clamp-2">
                                  {sharedPostsData[repliedToMessage.post_id].description}
                                </p>
                              )}
                              
                              {/* Show media if exists */}
                              {sharedPostsData[repliedToMessage.post_id].media_url && (
                                <div className="mt-2 max-h-32 overflow-hidden rounded">
                                  {sharedPostsData[repliedToMessage.post_id].media_url.includes('.mp4') || 
                                   sharedPostsData[repliedToMessage.post_id].media_url.includes('.webm') ||
                                   sharedPostsData[repliedToMessage.post_id].media_url.includes('.mov') ? (
                                    <video 
                                      src={sharedPostsData[repliedToMessage.post_id].media_url} 
                                      className="w-full h-32 object-cover rounded"
                                    />
                                  ) : (
                                    <img 
                                      src={sharedPostsData[repliedToMessage.post_id].media_url} 
                                      alt="Post media"
                                      className="w-full h-32 object-cover rounded"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Show regular message content */
                            <p className="text-sm text-gray-300 truncate break-words whitespace-pre-wrap line-clamp-2">
                              {repliedToMessage.content || (repliedToMessage.media_url ? '[Image/Video]' : '[Message]')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setRepliedToMessage(null)}
                          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1"
                          title="Cancel reply"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Media Preview */}
                    {mediaPreview && (
                      <div className="mb-3">
                        <div className="relative inline-block">
                          <img
                            src={mediaPreview}
                            alt="preview"
                            className="max-h-32 rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setMediaFile(null)
                              setMediaPreview(null)
                            }}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded-full p-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex flex-col gap-0">
                      <div className="relative flex gap-2 bg-[#1f1f1f] border-t border-gray-800 p-4">
                        <label className="cursor-pointer text-gray-400 hover:text-white transition-colors flex-shrink-0 pt-2">
                          <Plus size={20} />
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleMediaChange}
                            className="hidden"
                          />
                        </label>
                        
                        <div className="flex-1 relative">
                          <textarea
                            ref={textareaRef}
                            value={messageContent}
                            onChange={handleMessageInputChange}
                            onKeyDown={(e) => {
                              // Send on Enter, but not if Shift is held
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSendMessage(e as any)
                              }
                              // Shift+Enter adds a newline naturally (default textarea behavior)
                            }}
                            placeholder="Type a message... (Shift+Enter for new line)"
                            className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-2 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-none max-h-48 overflow-y-auto"
                            rows={1}
                          />
                          
                          <button
                            type="submit"
                            disabled={(!messageContent.trim() && !mediaFile) || sending}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#ff4234] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-colors flex-shrink-0"
                          >
                            <Send size={20} />
                          </button>
                        </div>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <RightSidebar allies={allies} />
      </div>
    </div>
  )
}
