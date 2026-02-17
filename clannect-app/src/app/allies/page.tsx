'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Home, Zap, Users, Plus, User, Settings, LogOut, Search, Send, Frown, Check, X, ShoppingCart, Bookmark } from 'lucide-react'
import GlobalLoading from '../components/GlobalLoading'
import RightSidebar from '../components/RightSidebar'
import AvatarWithFrame from '../components/AvatarWithFrame'

interface AllyRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: string
  created_at: string
  sender_profile?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
    equipped_frame: number | null
  }
  receiver_profile?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
    equipped_frame: number | null
  }
}

interface Ally {
  id: string
  user_id: string
  ally_id: string
  created_at: string
  profile?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
    equipped_frame: number | null
  }
}

export default function AlliesPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSidebarTab, setActiveSidebarTab] = useState('allies')
  const [activeTab, setActiveTab] = useState('my-allies')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<AllyRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<AllyRequest[]>([])
  const [allies, setAllies] = useState<Ally[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [hoveredAllyId, setHoveredAllyId] = useState<string | null>(null)
  const [removeAllyModalOpen, setRemoveAllyModalOpen] = useState(false)
  const [allyToRemove, setAllyToRemove] = useState<Ally | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [allyRequestCount, setAllyRequestCount] = useState(0)
  const userIdRef = useRef<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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

  const fetchRequests = async (userId: string) => {
    try {
      console.log('Fetching requests for user:', userId)
      
      // Fetch pending requests (sent by current user)
      const { data: pending, error: pendingError } = await supabase
        .from('ally_requests')
        .select('*')
        .eq('sender_id', userId)
        .eq('status', 'pending')

      if (pendingError) {
        console.error('Error fetching pending requests:', pendingError)
      } else if (pending) {
        console.log('Fetched pending requests:', pending)
        // Fetch receiver profiles
        const receiverIds = [...new Set(pending.map(r => r.receiver_id))]
        if (receiverIds.length > 0) {
          const { data: receiverProfiles } = await supabase
            .from('profiles')
.select('id, username, display_name, avatar_url, equipped_frame')
            .in('id', receiverIds)

          const profilesMap = new Map()
          receiverProfiles?.forEach(p => profilesMap.set(p.id, p))

          const enrichedPending = pending.map(req => ({
            ...req,
            receiver_profile: profilesMap.get(req.receiver_id),
          }))
          setPendingRequests(enrichedPending)
        } else {
          setPendingRequests([])
        }
      }

      // Fetch received requests (sent to current user)
      console.log('Fetching received requests for user:', userId)
      const { data: received, error: receivedError } = await supabase
        .from('ally_requests')
        .select('*')
        .eq('receiver_id', userId)
        .eq('status', 'pending')

      if (receivedError) {
        console.error('Error fetching received requests:', receivedError)
      } else if (received) {
        console.log('Fetched received requests:', received)
        // Fetch sender profiles
        const senderIds = [...new Set(received.map(r => r.sender_id))]
        if (senderIds.length > 0) {
          const { data: senderProfiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, equipped_frame')
            .in('id', senderIds)

          const profilesMap = new Map()
          senderProfiles?.forEach(p => profilesMap.set(p.id, p))

          const enrichedReceived = received.map(req => ({
            ...req,
            sender_profile: profilesMap.get(req.sender_id),
          }))
          setReceivedRequests(enrichedReceived)
          console.log('Set received requests:', enrichedReceived)
        } else {
          setReceivedRequests([])
        }
      }
      
      console.log('Request fetching complete')
    } catch (err) {
      console.error('Error fetching requests:', err)
    }
  }

  const fetchAllies = async (userId: string) => {
    try {
      console.log('Fetching allies for user:', userId)
      const { data: alliesData, error } = await supabase
        .from('allies')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching allies:', error)
        return
      }
      
      console.log('Fetched allies data:', alliesData)

      if (alliesData) {
        // Fetch ally profiles
        const allyIds = [...new Set(alliesData.map(a => a.ally_id))]
        console.log('Ally IDs to fetch profiles for:', allyIds)
        
        if (allyIds.length === 0) {
          console.log('No allies, setting empty array')
          setAllies([])
          return
        }

        const { data: allyProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, equipped_frame')
          .in('id', allyIds)

        if (profileError) {
          console.error('Error fetching ally profiles:', profileError)
          return
        }

        console.log('Fetched ally profiles:', allyProfiles)

        const profilesMap = new Map()
        allyProfiles?.forEach(p => profilesMap.set(p.id, p))

        const enrichedAllies = alliesData.map(ally => ({
          ...ally,
          profile: profilesMap.get(ally.ally_id),
        }))
        
        console.log('Setting allies state:', enrichedAllies)
        setAllies(enrichedAllies)
      }
    } catch (err) {
      console.error('Error fetching allies:', err)
    }
  }

  const handleSearchAndSendRequest = async () => {
    if (!searchQuery.trim() || !user) {
      setSearchError('Please enter a username')
      return
    }

    try {
      setIsSearching(true)
      setSearchError('')

      // Search for the user by username
      const { data: targetUser, error: searchError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, equipped_frame')
        .eq('username', searchQuery.trim())
        .single()

      if (searchError || !targetUser) {
        setSearchError("Please double-check the username, we couldn't find your ally.")
        return
      }

      // Check if requesting self
      if (targetUser.id === user.id) {
        setSearchError('You cannot send a request to yourself')
        return
      }

      // Check target user's ally request permissions
      const { data: targetSettings } = await supabase
        .from('user_settings')
        .select('ally_request_permissions')
        .eq('user_id', targetUser.id)
        .maybeSingle()

      if (targetSettings?.ally_request_permissions === 'nobody') {
        setSearchError('You can not send a request to this user, they do not accept requests.')
        return
      }

      // Check if already allies
      const { data: existingAlly1 } = await supabase
        .from('allies')
        .select('id')
        .eq('user_id', user.id)
        .eq('ally_id', targetUser.id)
        .maybeSingle()

      const { data: existingAlly2 } = await supabase
        .from('allies')
        .select('id')
        .eq('user_id', targetUser.id)
        .eq('ally_id', user.id)
        .maybeSingle()

      if (existingAlly1 || existingAlly2) {
        console.log('Existing allies found:', { existingAlly1, existingAlly2 })
        setSearchError('You are already allies with this user')
        return
      }

      // Check if request already exists (sender -> receiver)
      const { data: existingRequest1 } = await supabase
        .from('ally_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', targetUser.id)
        .maybeSingle()

      if (existingRequest1) {
        if (existingRequest1.status === 'pending') {
          setSearchError('You already sent a request to this user')
        } else {
          setSearchError('You are already allies with this user')
        }
        return
      }

      // Check if request already exists (receiver -> sender)
      const { data: existingRequest2 } = await supabase
        .from('ally_requests')
        .select('id, status')
        .eq('sender_id', targetUser.id)
        .eq('receiver_id', user.id)
        .maybeSingle()

      if (existingRequest2) {
        if (existingRequest2.status === 'pending') {
          setSearchError('This user already sent you a request')
        } else {
          setSearchError('You are already allies with this user')
        }
        return
      }

      // Create the ally request
      const { error: insertError } = await supabase
        .from('ally_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetUser.id,
          status: 'pending',
        })

      if (insertError) throw insertError

      setSearchQuery('')
      await fetchRequests(user.id)
    } catch (err) {
      console.error('Error sending request:', err)
      setSearchError('An error occurred while sending the request')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return

    try {
      setIsProcessing(true)

      // Update request status to accepted
      const { error: updateError } = await supabase
        .from('ally_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)

      if (updateError) {
        console.error('Error updating request:', updateError)
        throw updateError
      }

      // Create ally relationship from receiver to sender
      const { error: allyError1 } = await supabase
        .from('allies')
        .insert({
          user_id: user.id,
          ally_id: senderId,
        })

      if (allyError1) {
        console.error('Error creating ally relationship 1:', allyError1)
        throw allyError1
      }

      // Create ally relationship from sender to receiver
      const { error: allyError2 } = await supabase
        .from('allies')
        .insert({
          user_id: senderId,
          ally_id: user.id,
        })

      if (allyError2) {
        console.error('Error creating ally relationship 2:', allyError2)
        throw allyError2
      }

      // Create conversation and add members using database function
      console.log('Creating conversation with:', { user1_id: user.id, user2_id: senderId })
      
      const { data: conversationId, error: conversationError } = await supabase
        .rpc('create_conversation_with_members', {
          user1_id: user.id,
          user2_id: senderId,
        })

      console.log('RPC Response:', { conversationId, conversationError })

      if (conversationError) {
        console.error('Error creating conversation via RPC:', conversationError)
        throw conversationError
      }

      if (!conversationId) {
        console.error('Conversation creation returned null ID')
        throw new Error('Failed to create conversation: no ID returned')
      }

      console.log('Request accepted successfully! Conversation created:', conversationId)

      // Update ally request count immediately
      setAllyRequestCount(prev => Math.max(0, prev - 1))

      // Wait a bit longer to ensure database consistency
      setTimeout(async () => {
        await fetchRequests(user.id)
        await fetchAllies(user.id)
      }, 1000)
    } catch (err) {
      console.error('Error accepting request:', err)
      alert('Failed to accept request. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    if (!user) return

    try {
      setIsProcessing(true)

      // Call the database function to decline the request
      const { error } = await supabase.rpc('decline_ally_request', {
        request_id: requestId
      })

      if (error) {
        console.error('Error declining request:', error)
        throw error
      }

      // Update ally request count immediately
      setAllyRequestCount(prev => Math.max(0, prev - 1))

      console.log('Request declined successfully, refetching...')
      await fetchRequests(user.id)
    } catch (err) {
      console.error('Error declining request:', err)
      alert('Failed to decline request. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveAlly = async (allyId: string) => {
    if (!user) return

    try {
      setIsRemoving(true)

      // Call the database function to remove both directions atomically
      const { error } = await supabase.rpc('remove_ally_relationship', {
        target_ally_id: allyId
      })

      if (error) {
        console.error('Error removing ally relationship:', error)
        throw error
      }

      console.log('Ally relationship removed successfully, refetching...')

      // Refetch allies
      await fetchAllies(user.id)
      
      setRemoveAllyModalOpen(false)
      setAllyToRemove(null)
    } catch (err) {
      console.error('Error removing ally:', err)
      alert('Failed to remove ally. Please try again.')
    } finally {
      setIsRemoving(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          console.error('Auth error:', error)
          router.push('/login')
          return
        }
        
        const userId = session.user.id
        userIdRef.current = userId
        setUser(session.user)
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (profileData) {
          setProfile(profileData)
        }
        
        // Fetch requests and allies
        await fetchRequests(userId)
        await fetchAllies(userId)

        // Create a unique room name for this user's subscriptions
        const userId_clean = userId.replace(/-/g, '')

        // Subscribe to real-time updates on allies table
        const alliesChannel = supabase
          .channel(`public:allies:${userId_clean}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'allies',
              filter: `user_id=eq.${userId}|ally_id=eq.${userId}`
            },
            async (payload) => {
              console.log('🔄 Allies table changed:', payload)
              if (userIdRef.current) {
                await fetchAllies(userIdRef.current)
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Allies subscription connected')
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.log('⚠️ Allies subscription warning (this is non-critical):', status, err)
            }
          })

        // Subscribe to real-time updates on ally_requests table
        const requestsChannel = supabase
          .channel(`public:ally_requests:${userId_clean}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'ally_requests',
              filter: `sender_id=eq.${userId}|receiver_id=eq.${userId}`
            },
            async (payload) => {
              console.log('🔄 Ally requests table changed:', payload)
              if (userIdRef.current) {
                await fetchRequests(userIdRef.current)
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Requests subscription connected')
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.log('⚠️ Requests subscription warning (this is non-critical):', status, err)
            }
          })

        // Fetch ally request count
        const fetchAllyRequestCount = async () => {
          const response = await fetch('/api/get-ally-request-count')
          if (response.ok) {
            const data = await response.json()
            setAllyRequestCount(data.count || 0)
          }
        }

        await fetchAllyRequestCount()

        // Subscribe to real-time updates for ally request count
        const countChannel = supabase
          .channel(`ally-requests-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'ally_requests',
              filter: `receiver_id=eq.${userId}`
            },
            async () => {
              await fetchAllyRequestCount()
            }
          )
          .subscribe()

        setLoading(false)

        return () => {
          console.log('Cleaning up subscriptions...')
          alliesChannel.unsubscribe()
          requestsChannel.unsubscribe()
          countChannel.unsubscribe()
        }
      } catch (err) {
        console.error('Unexpected auth error:', err)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  if (loading) {
    return <GlobalLoading />
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
              ].map((item) => {
                const Icon = item.icon
                const displayBadge = item.badge && item.badge > 0
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (['post', 'profile', 'allies', 'settings', 'shop', 'collections'].includes(item.id)) {
                        router.push(`/${item.id}`)
                      } else if (item.id === 'hub') {
                        router.push('/hub')
                      } else {
                        setActiveSidebarTab(item.id)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                      activeSidebarTab === item.id
                        ? 'bg-[#ff4234] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{item.label}</span>
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

        {/* Main Content */}
        <div className="flex-1 bg-[#181818] border-r border-gray-800 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Tabs */}
            <div className="flex gap-8 mb-8 border-b border-gray-800">
              <button
                onClick={() => {
                  setActiveTab('my-allies')
                  setSearchQuery('')
                  setSearchError('')
                }}
                className={`pb-3 font-semibold text-sm transition-all ${
                  activeTab === 'my-allies'
                    ? 'text-[#ff4234] border-b-2 border-[#ff4234]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                My Allies
              </button>
              <button
                onClick={() => {
                  setActiveTab('ally-requests')
                  setSearchQuery('')
                  setSearchError('')
                }}
                className={`pb-3 font-semibold text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'ally-requests'
                    ? 'text-[#ff4234] border-b-2 border-[#ff4234]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span>Ally Requests</span>
                {allyRequestCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-fit">
                    {allyRequestCount > 9 ? '+9' : allyRequestCount}
                  </span>
                )}
              </button>
            </div>

            {/* My Allies Tab */}
            {activeTab === 'my-allies' && (
              <>
                {allies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Frown size={64} className="text-[#ff4234] mb-4" strokeWidth={1.5} />
                    <h2 className="text-3xl font-bold text-[#ff4234] mb-2">No Allies</h2>
                    <p className="text-gray-400 text-center max-w-sm">No one is here for now, lonely warrior.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allies.map((ally) => (
                      <div
                        key={ally.id}
                        className="bg-[#252525] rounded-lg p-4 border border-gray-700 flex items-center justify-between relative group"
                        onMouseEnter={() => setHoveredAllyId(ally.id)}
                        onMouseLeave={() => setHoveredAllyId(null)}
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer -ml-4 -my-4 pl-4 py-4 rounded-l-lg transition-colors max-w-[calc(100%-45px)]"
                          onClick={() => router.push(`/profile/${ally.profile?.username}`)}
                        >
                          <AvatarWithFrame
                            src={ally.profile?.avatar_url}
                            alt={ally.profile?.username || 'User'}
                            equippedFrame={ally.profile?.equipped_frame}
                            size="lg"
                            frameScale={1.25}
                            className={`transition-opacity ${
                              hoveredAllyId === ally.id ? 'opacity-70' : 'opacity-100'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-white font-semibold text-sm truncate ${
                              hoveredAllyId === ally.id ? 'underline' : ''
                            }`}>{ally.profile?.display_name || ally.profile?.username}</h3>
                            <p className="text-gray-400 text-xs truncate">@{ally.profile?.username}</p>
                          </div>
                        </div>

                        {/* Delete Button - Only show on hover */}
                        {hoveredAllyId === ally.id && (
                          <button
                            onClick={() => {
                              setAllyToRemove(ally)
                              setRemoveAllyModalOpen(true)
                            }}
                            className="ml-3 flex-shrink-0 p-1.5 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Remove ally"
                          >
                            <X size={18} className="text-red-500 hover:text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Ally Requests Tab */}
            {activeTab === 'ally-requests' && (
              <div className="space-y-6">
                {/* Search Bar with Send Request Button */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      placeholder="Search for allies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchAndSendRequest()}
                      className="w-full bg-[#252525] text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 border border-gray-700 focus:border-[#ff4234] focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSearchAndSendRequest}
                    disabled={isSearching}
                    className="flex items-center gap-2 bg-[#ff4234] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm whitespace-nowrap"
                  >
                    <Send size={16} />
                    <span>{isSearching ? 'Searching...' : 'Send Request'}</span>
                  </button>
                </div>

                {/* Search Error */}
                {searchError && (
                  <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{searchError}</p>
                  </div>
                )}

                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-white font-semibold">Pending Requests</h3>
                      <div className="flex-1 h-px bg-gray-700"></div>
                    </div>
                    <div className="space-y-3">
                      {pendingRequests.map((request) => (
                        <div key={request.id} className="bg-[#252525] rounded-lg p-4 border border-gray-700 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <AvatarWithFrame
                              src={request.receiver_profile?.avatar_url}
                              alt={request.receiver_profile?.username || 'User'}
                              equippedFrame={request.receiver_profile?.equipped_frame}
                              size="md"
                              frameScale={1.25}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-semibold text-sm">{request.receiver_profile?.display_name || request.receiver_profile?.username}</h4>
                              <p className="text-gray-400 text-xs">@{request.receiver_profile?.username}</p>
                            </div>
                          </div>
                          <span className="text-[#ff4234] text-xs font-semibold whitespace-nowrap ml-3">Pending</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Received Requests */}
                {receivedRequests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-white font-semibold">Received Requests</h3>
                      <div className="flex-1 h-px bg-gray-700"></div>
                    </div>
                    <div className="space-y-3">
                      {receivedRequests.map((request) => (
                        <div
                          key={request.id}
                          className="bg-[#252525] rounded-lg p-4 border border-gray-700 flex items-center justify-between group"
                        >
                          <div
                            className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-[#2a2a2a] -ml-4 -my-4 pl-4 py-4 rounded-l-lg transition-colors"
                            onMouseEnter={() => setHoveredAllyId(request.id)}
                            onMouseLeave={() => setHoveredAllyId(null)}
                            onClick={() => router.push(`/profile/${request.sender_profile?.username}`)}
                          >
                            <AvatarWithFrame
                              src={request.sender_profile?.avatar_url}
                              alt={request.sender_profile?.username || 'User'}
                              equippedFrame={request.sender_profile?.equipped_frame}
                              size="md"
                              frameScale={1.25}
                              className={`transition-opacity ${
                                hoveredAllyId === request.id ? 'opacity-70' : 'opacity-100'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-white font-semibold text-sm ${
                                hoveredAllyId === request.id ? 'underline' : ''
                              }`}>{request.sender_profile?.display_name || request.sender_profile?.username}</h4>
                              <p className="text-gray-400 text-xs">@{request.sender_profile?.username}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-3">
                            <button
                              onClick={() => handleAcceptRequest(request.id, request.sender_id)}
                              disabled={isProcessing}
                              className="flex items-center justify-center gap-1 bg-[#ff4234] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded-lg transition-all duration-200 text-xs"
                            >
                              <Check size={14} />
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(request.id)}
                              disabled={isProcessing}
                              className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded-lg transition-all duration-200 text-xs"
                            >
                              <X size={14} />
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {pendingRequests.length === 0 && receivedRequests.length === 0 && !searchError && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-gray-400 text-lg">No requests yet</p>
                    <p className="text-gray-500 text-sm mt-2">Search for players and send them ally requests!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Allies */}
        {/* Right Sidebar */}
        <RightSidebar allies={allies} />

        {/* Remove Ally Modal */}
        {removeAllyModalOpen && allyToRemove && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl p-6 max-w-sm w-full mx-4 border border-gray-800">
              <h2 className="text-white font-bold text-lg mb-2">Remove Ally?</h2>
              <p className="text-gray-400 text-sm mb-6">Are you sure you want to remove <span className="font-semibold text-white">{allyToRemove.profile?.display_name || allyToRemove.profile?.username}</span> from your allies?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRemoveAllyModalOpen(false)
                    setAllyToRemove(null)
                  }}
                  disabled={isRemoving}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveAlly(allyToRemove.ally_id)}
                  disabled={isRemoving}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {isRemoving ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
