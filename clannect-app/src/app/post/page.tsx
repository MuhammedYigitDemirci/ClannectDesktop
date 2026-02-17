'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { compressPostMedia, shouldCompress } from '@/lib/imageCompression'
import { X, Upload, Home, Plus, Users, User, Settings, LogOut, ShoppingCart, Bookmark } from 'lucide-react'
import RightSidebar from '../components/RightSidebar'
import { WarningModal } from '../components/WarningModal'
import LevelUpModal from '../components/LevelUpModal'
import AvatarWithFrame from '../components/AvatarWithFrame'
import GlobalLoading from '../components/GlobalLoading'

// XP system configuration
const XP_CONFIG = {
  profileEdits: { avatar: 10, banner: 10, aboutMe: 30 },
  actions: { post: 10, comment: 3, perFollower: 5 },
  cooldowns: { postHours: 1, commentPeriodsMinutes: 20, commentMax: 5 },
  levelRequirements: [
    { minLevel: 1, maxLevel: 10, xpPerLevel: 50 },      // Levels 1-9: 50 XP each
    { minLevel: 10, maxLevel: 30, xpPerLevel: 125 },    // Levels 10-29: 125 XP each
    { minLevel: 30, maxLevel: 50, xpPerLevel: 300 },    // Levels 30-49: 300 XP each
    { minLevel: 50, maxLevel: 80, xpPerLevel: 700 },    // Levels 50-79: 700 XP each
    { minLevel: 80, maxLevel: 90, xpPerLevel: 1500 },   // Levels 80-89: 1500 XP each
    { minLevel: 90, maxLevel: 101, xpPerLevel: 2000 },  // Levels 90-100: 2000 XP each
  ]
}

export default function PostPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('post')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [allies, setAllies] = useState<any[]>([])
  const [rightSidebarLoading, setRightSidebarLoading] = useState(true)
  const [postCooldownMinutes, setPostCooldownMinutes] = useState<number>(0)
  const [allyRequestCount, setAllyRequestCount] = useState(0)
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; cooldownTime?: string }>({ isOpen: false, title: '', message: '' })
  
  // Level up modal states
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false)
  const [newLevelValue, setNewLevelValue] = useState(0)
  const [levelUpCloinReward, setLevelUpCloinReward] = useState(0)
  
  const router = useRouter()
  const supabase = createClient()

  // Helper function to show warning modal
  const showWarning = (title: string, message: string, cooldownTime?: string) => {
    setModalState({ isOpen: true, title, message, cooldownTime })
  }

  // Format seconds to "X Minutes Y Seconds" display
  const formatCooldownTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    return `${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'} ${seconds} ${seconds === 1 ? 'Second' : 'Seconds'}`
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


  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media: null as File | null,
  })
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)

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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          console.error('Auth error:', error)
          router.push('/login')
          return
        }
        
        setUser(session.user)
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData)
          // Check post cooldown from cooldown_expires_at column
          if (profileData.cooldown_expires_at) {
            const expiresAt = new Date(profileData.cooldown_expires_at)
            const now = new Date()
            const remainingMs = expiresAt.getTime() - now.getTime()
            const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
            
            console.log('Cooldown check on page load:', { 
              expiresAt: expiresAt.toISOString(),
              now: now.toISOString(),
              remainingSeconds 
            })
            
            if (remainingSeconds > 0) {
              setPostCooldownMinutes(remainingSeconds)
            }
          }
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

  // Fetch and subscribe to ally request count
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

    // Subscribe to real-time updates for ally request count
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

  // Timer for cooldown countdown - check cooldown_expires_at column
  useEffect(() => {
    if (postCooldownMinutes <= 0 || !profile?.cooldown_expires_at) return

    const interval = setInterval(() => {
      // Every second, check if cooldown has expired
      const expiresAt = new Date(profile.cooldown_expires_at)
      const now = new Date()
      const remainingMs = expiresAt.getTime() - now.getTime()
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
      
      if (remainingSeconds <= 0) {
        setPostCooldownMinutes(0)
        clearInterval(interval)
      } else {
        setPostCooldownMinutes(remainingSeconds)
      }
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [postCooldownMinutes, profile?.cooldown_expires_at])

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, media: file })
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeMedia = () => {
    setFormData({ ...formData, media: null })
    setMediaPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      showWarning('Missing Title', 'Please enter a title for your post.')
      return
    }

    if (!user || !profile) return

    // Block if we're currently showing cooldown
    if (postCooldownMinutes > 0) {
      console.warn('Submission blocked - currently in cooldown:', postCooldownMinutes, 'seconds')
      return
    }

    console.log('Proceeding with post submission')
    setIsSubmitting(true)

    try {
      let mediaUrl = null

      // Upload media if provided
      if (formData.media) {
        const fileExt = formData.media.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        
        // Compress media if it's an image and needed
        let fileToUpload = formData.media
        if (formData.media && formData.media.type.startsWith('image/') && shouldCompress(formData.media)) {
          try {
            const compressedBlob = await compressPostMedia(formData.media)
            fileToUpload = new File([compressedBlob], formData.media.name, { type: compressedBlob.type })
          } catch (err) {
            console.warn('Compression failed, uploading original:', err)
            // Continue with original file if compression fails
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(`posts/${fileName}`, fileToUpload)
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
          showWarning('Upload Failed', 'Failed to upload media. Please try again.')
          setIsSubmitting(false)
          return
        }

        // Get public URL
        const { data } = supabase.storage
          .from('post-media')
          .getPublicUrl(`posts/${fileName}`)
        
        mediaUrl = data?.publicUrl || null
      }

      // Calculate new XP (award XP for post creation)
      const newXp = profile.xp + XP_CONFIG.actions.post
      const now = new Date().toISOString()

      // Insert post into database
      const { error: dbError } = await supabase
        .from('posts')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            media_url: mediaUrl,
            created_at: now,
          },
        ])
      
      if (dbError) {
        console.error('Database error details:', dbError)
        setIsSubmitting(false)
        
        // Handle cooldown error specifically (code P0001 is PostgreSQL exception)
        if (dbError.code === 'P0001') {
          console.warn('Cooldown error detected from database trigger - fetching cooldown_expires_at')
          // Fetch the updated cooldown_expires_at from database
          const { data: profileData } = await supabase
            .from('profiles')
            .select('cooldown_expires_at')
            .eq('id', user.id)
            .single()
          
          if (profileData?.cooldown_expires_at) {
            const expiresAt = new Date(profileData.cooldown_expires_at)
            const now = new Date()
            const remainingMs = expiresAt.getTime() - now.getTime()
            const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
            setPostCooldownMinutes(remainingSeconds)
            console.log('Cooldown activated, remaining:', remainingSeconds, 'seconds')
          }
          return
        }
        
        const errorMsg = dbError.message || 'Failed to create post. Check console for details.'
        showWarning('Post Creation Failed', errorMsg)
        return
      }

      // Update profile with new XP, level, and last_post_time
      const newLevel = calculateLevelFromXp(newXp)
      const oldLevel = profile.level || 1
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ xp: newXp, level: newLevel, last_post_time: now })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating XP:', updateError)
        showWarning('XP Update Failed', 'Post created but XP update failed. Please refresh your profile.')
        setIsSubmitting(false)
        return
      } else {
        console.log(`✨ Earned ${XP_CONFIG.actions.post} XP from creating a post!`)
        console.log('Post time set to:', now)
        
        // Handle level up and cloin reward
        if (newLevel > oldLevel) {
          await handleLevelUpAndAwardCloin(oldLevel, newLevel)
        }
      }

      // Refetch profile to verify updates
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (updatedProfile) {
        setProfile(updatedProfile)
        console.log('Profile refetched after XP update:', updatedProfile)
      }

      // Reset form and show success
      setFormData({ title: '', description: '', media: null })
      setMediaPreview(null)
      setSuccessMessage('Post created successfully! 🎉 +' + XP_CONFIG.actions.post + ' XP')
      
      // Refetch profile to get updated cooldown_expires_at from database
      const { data: cooldownData } = await supabase
        .from('profiles')
        .select('cooldown_expires_at')
        .eq('id', user.id)
        .single()
      
      if (cooldownData?.cooldown_expires_at) {
        const expiresAt = new Date(cooldownData.cooldown_expires_at)
        const now = new Date()
        const remainingMs = expiresAt.getTime() - now.getTime()
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
        setPostCooldownMinutes(remainingSeconds)
        console.log('Post created, cooldown set to:', remainingSeconds, 'seconds')
      }
      
      setTimeout(() => {
        setSuccessMessage('')
        router.push('/hub')
      }, 2000)

    } catch (err) {
      console.error('Error creating post details:', err)
      showWarning('Error', `An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}. Check console for details.`)
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <GlobalLoading />
  }

  return (
    <div className="min-h-screen bg-[#181818] text-white">
      {/* Warning Modal */}
      <WarningModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        cooldownTime={modalState.cooldownTime}
        onClose={() => setModalState({ isOpen: false, title: '', message: '' })}
      />

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
                      } else {
                        setActiveTab(item.id)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                      activeTab === item.id
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

        {/* Main Content - Post Form */}
        <div className="flex-1 bg-[#181818] border-r border-gray-800 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create a Post</h1>
            <p className="text-gray-400 mb-8">Share your thoughts and updates with your clan</p>

            {successMessage && (
              <div className="bg-green-500/20 border border-green-500 text-green-300 p-4 rounded-lg mb-6">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-white font-semibold text-sm mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter post title"
                  maxLength={200}
                  className="w-full bg-[#252525] border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#ff4234] transition-colors"
                />
                <p className="text-gray-500 text-xs mt-1">{formData.title.length}/200</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-white font-semibold text-sm mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Write your post description... (optional)"
                  maxLength={2000}
                  rows={8}
                  className="w-full bg-[#252525] border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#ff4234] transition-colors resize-none"
                />
                <p className="text-gray-500 text-xs mt-1">{formData.description.length}/2000</p>
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-white font-semibold text-sm mb-2">
                  Media (Optional)
                </label>
                {!mediaPreview ? (
                  <label className="w-full border-2 border-dashed border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#ff4234] transition-colors bg-[#252525]/50">
                    <Upload size={32} className="text-gray-400 mb-2" />
                    <span className="text-gray-300 font-medium">Click to upload image or video</span>
                    <span className="text-gray-500 text-sm mt-1">PNG, JPG, MP4, WebM (Max 50MB)</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative w-full bg-[#252525] rounded-lg overflow-hidden">
                    {formData.media?.type.startsWith('image/') ? (
                      <img 
                        src={mediaPreview} 
                        alt="Preview" 
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    ) : (
                      <video 
                        src={mediaPreview} 
                        controls 
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={removeMedia}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-full transition-colors"
                    >
                      <X size={20} className="text-white" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || postCooldownMinutes > 0}
                className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ${
                  postCooldownMinutes > 0
                    ? 'bg-yellow-600 hover:bg-yellow-600 cursor-not-allowed'
                    : 'bg-[#ff4234] hover:bg-red-600 disabled:bg-gray-600'
                }`}
              >
                {postCooldownMinutes > 0 ? `Cooldown: ${formatCooldownTime(postCooldownMinutes)}` : isSubmitting ? 'Posting...' : 'Post!'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Sidebar - Allies */}
        <RightSidebar allies={allies} />

        {/* Level Up Modal */}
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
