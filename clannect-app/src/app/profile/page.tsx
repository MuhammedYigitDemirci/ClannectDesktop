'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Home, Plus, Users, User, Settings, LogOut, Camera, Trash2, Heart, MessageCircle, X, ShoppingCart, MoreVertical, Link, Bookmark, Pin, Ban, BarChart } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { compressAvatar, compressBanner, shouldCompress, deleteFileFromStorage } from '@/lib/imageCompression'
import RightSidebar from '../components/RightSidebar'
import GlobalLoading from '../components/GlobalLoading'
import AvatarWithFrame from '../components/AvatarWithFrame'

interface Profile {
  id: string
  username: string
  email: string
  display_name: string
  avatar_url: string
  about_me: string
  banner_gradient: string
  banner_url?: string
  created_at: string
  level: number
  xp: number
  last_post_time?: string
  cooldown_expires_at?: string
  avatar_xp_awarded: boolean
  banner_xp_awarded: boolean
  about_me_xp_awarded: boolean
  cloin?: number
  equipped_frame?: number | null
  equipped_theme?: number | null
  pinned_posts?: string[]
}

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

// Calculate XP needed for next level
const calculateXpForLevel = (level: number): number => {
  if (level >= 100) return 0
  const config = XP_CONFIG.levelRequirements.find(c => level >= c.minLevel && level < c.maxLevel)
  return config ? config.xpPerLevel : 0
}

// Calculate total XP needed to reach a specific level
const calculateTotalXpForLevel = (targetLevel: number): number => {
  let totalXp = 0
  for (let level = 1; level < targetLevel; level++) {
    totalXp += calculateXpForLevel(level)
  }
  return totalXp
}

// Get level from total XP
const getLevelFromXp = (totalXp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progress: number } => {
  let level = 1
  let xpUsed = 0
  
  while (level < 100) {
    const xpNeeded = calculateXpForLevel(level)
    if (xpUsed + xpNeeded > totalXp) break
    xpUsed += xpNeeded
    level++
  }
  
  const currentLevelXp = totalXp - xpUsed
  const nextLevelXp = calculateXpForLevel(level)
  const progress = nextLevelXp > 0 ? (currentLevelXp / nextLevelXp) * 100 : 100
  
  return { level, currentLevelXp, nextLevelXp, progress }
}

interface Post {
  id: string
  user_id: string
  title: string
  description: string
  media_url: string
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const postsRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [allies, setAllies] = useState<any[]>([])
  const [rightSidebarLoading, setRightSidebarLoading] = useState(true)

  // Edit Mode States
  const [isEditMode, setIsEditMode] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editAboutMe, setEditAboutMe] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Validation States
  const [displayNameError, setDisplayNameError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  // Delete Post States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [copiedLinkPostId, setCopiedLinkPostId] = useState<string | null>(null)
  const [isBlockingUser, setIsBlockingUser] = useState(false)
  const [showBlockConfirmation, setShowBlockConfirmation] = useState(false)
  const [blockTarget, setBlockTarget] = useState<{ id: string; displayName: string } | null>(null)

  // Engagement Feature States - Likes and Comments
  const [likeStates, setLikeStates] = useState<Record<string, { isLiked: boolean; count: number }>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null)
  const [postComments, setPostComments] = useState<Record<string, any[]>>({})
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
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
  // Pagination for stats modal
  const [statsLikedOffset, setStatsLikedOffset] = useState(0)
  const [statsCommentedOffset, setStatsCommentedOffset] = useState(0)
  const [statsLikedHasMore, setStatsLikedHasMore] = useState(true)
  const [statsCommentedHasMore, setStatsCommentedHasMore] = useState(true)
  const [statsLikedLoadingMore, setStatsLikedLoadingMore] = useState(false)
  const [statsCommentedLoadingMore, setStatsCommentedLoadingMore] = useState(false)
  const [commentLikeStates, setCommentLikeStates] = useState<Record<string, { isLiked: boolean; count: number }>>({})
  const [loadingCommentLikes, setLoadingCommentLikes] = useState<Record<string, boolean>>({})

  // Follower States
  const [followerCount, setFollowerCount] = useState<number>(0)

  // Allies Count State
  const [alliesCount, setAlliesCount] = useState<number>(0)

  // Ally Request Count State
  const [allyRequestCount, setAllyRequestCount] = useState(0)

  // (themes will be re-designed later)
  const [hasOwnedThemes, setHasOwnedThemes] = useState(false)
  const [hasOceanOwned, setHasOceanOwned] = useState(false)
  const hasOceanTheme = (profile as any)?.equipped_theme === 1
  const oceanBgStyle = hasOceanTheme
    ? { backgroundImage: "url('/OceanBlueTheme.png')", backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
    : undefined
  const hasSunsetTheme = (profile as any)?.equipped_theme === 2
  const sunsetBgStyle = hasSunsetTheme
    ? { backgroundImage: "url('/SunsetGlowTheme.png')", backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
    : undefined
  const hasGalaxyTheme = (profile as any)?.equipped_theme === 3
  const galaxyBgStyle = hasGalaxyTheme
    ? { backgroundImage: "url('/GalaxyDreamsTheme.png')", backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
    : undefined

  // Allies Modal States
  const [alliesModalOpen, setAlliesModalOpen] = useState(false)
  const [alliesModalSearchQuery, setAlliesModalSearchQuery] = useState('')
  const [alliesForModal, setAlliesForModal] = useState<any[]>([])

  // Followers Modal States
  const [followersModalOpen, setFollowersModalOpen] = useState(false)
  const [followersModalSearchQuery, setFollowersModalSearchQuery] = useState('')
  const [followersForModal, setFollowersForModal] = useState<any[]>([])
  const [alliesModalLoading, setAlliesModalLoading] = useState(false)
  const [followersModalLoading, setFollowersModalLoading] = useState(false)

  // XP and Cooldown States
  const [postCooldownMinutes, setPostCooldownMinutes] = useState<number>(0)
  const [commentCooldownMinutes, setCommentCooldownMinutes] = useState<number>(0)
  const [recentCommentsCount, setRecentCommentsCount] = useState<number>(0)

  // Check if post cooldown is active
  const checkPostCooldown = (): boolean => {
    if (!profile?.last_post_time) return false
    const lastPost = new Date(profile.last_post_time).getTime()
    const now = new Date().getTime()
    const diffMinutes = (now - lastPost) / (1000 * 60)
    return diffMinutes < XP_CONFIG.cooldowns.postHours * 60
  }

  // Add XP to profile
  const addXp = async (xpAmount: number) => {
    if (!user || !profile) return
    try {
      const newXp = profile.xp + xpAmount
      const { error } = await supabase
        .from('profiles')
        .update({ xp: newXp })
        .eq('id', user.id)
      
      if (!error) {
        setProfile(prev => prev ? { ...prev, xp: newXp } : null)
      }
    } catch (err) {
      console.error('Error adding XP:', err)
    }
  }

  // Check comment cooldown
  const checkCommentCooldown = async (): Promise<boolean> => {
    if (!user) return false
    try {
      const twentyMinutesAgo = new Date(Date.now() - XP_CONFIG.cooldowns.commentPeriodsMinutes * 60 * 1000)
      const { count } = await supabase
        .from('post_comments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', twentyMinutesAgo.toISOString())
      
      return (count || 0) >= XP_CONFIG.cooldowns.commentMax
    } catch (err) {
      console.error('Error checking comment cooldown:', err)
      return false
    }
  }

  // Validation Functions
  const validateDisplayName = (value: string): boolean => {
    // Allow any characters except emoji. Use a broad unicode range to detect emoji
    // sequences (including flags, pictographs, modifiers and variation selectors).
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{FE0F}\u200D]/u
    if (emojiRegex.test(value)) {
      setDisplayNameError('Display name cannot contain emojis')
      return false
    }
    setDisplayNameError(null)
    return true
  }

  const validateUsername = (value: string): boolean => {
    const validRegex = /^[a-zA-Z0-9_.]*$/
    if (!validRegex.test(value)) {
      setUsernameError('Username can only contain letters, numbers, dots, and underscores')
      return false
    }
    if (value.length < 3 && value.length > 0) {
      setUsernameError('Username must be at least 3 characters')
      return false
    }
    setUsernameError(null)
    return true
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return
    try {
      // Step 1: Capture and delete old avatar BEFORE uploading new one
      const oldAvatarUrl = profile?.avatar_url
      if (oldAvatarUrl) {
        console.log('🗑️ Step 1: Deleting old avatar:', oldAvatarUrl)
        const deleteResult = await deleteFileFromStorage(oldAvatarUrl, supabase)
        console.log('Step 1 result:', deleteResult ? '✅ Old avatar deleted' : '⚠️ Could not delete old avatar')
      }

      // Step 2: Compress avatar if needed
      console.log('📷 Step 2: Uploading new avatar')
      let fileToUpload = avatarFile
      if (shouldCompress(avatarFile)) {
        const compressedBlob = await compressAvatar(avatarFile)
        fileToUpload = new File([compressedBlob], avatarFile.name, { type: compressedBlob.type })
      }

      const fileExt = fileToUpload.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileToUpload)
      
      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      
      console.log('✅ Step 2: New avatar uploaded. New URL:', data.publicUrl)

      // Step 3: Update profile with new avatar URL
      console.log('💾 Step 3: Saving to database')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id)
      
      if (updateError) throw updateError
      console.log('✅ Step 3: Database updated')

      // Clear upload state
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setIsSaving(false)
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Banner image must be less than 5MB')
        return
      }
      setBannerFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setBannerPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadBanner = async () => {
    if (!bannerFile || !user) return
    try {
      // Step 1: Capture and delete old banner BEFORE uploading new one
      const oldBannerUrl = profile?.banner_url
      if (oldBannerUrl) {
        console.log('🗑️ Step 1: Deleting old banner:', oldBannerUrl)
        const deleteResult = await deleteFileFromStorage(oldBannerUrl, supabase)
        console.log('Step 1 result:', deleteResult ? '✅ Old banner deleted' : '⚠️ Could not delete old banner')
      }

      // Step 2: Compress banner if needed
      console.log('🖼️ Step 2: Uploading new banner')
      let fileToUpload = bannerFile
      if (shouldCompress(bannerFile)) {
        const compressedBlob = await compressBanner(bannerFile)
        fileToUpload = new File([compressedBlob], bannerFile.name, { type: compressedBlob.type })
      }

      const fileExt = fileToUpload.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, fileToUpload)
      
      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName)
      
      console.log('✅ Step 2: New banner uploaded. New URL:', data.publicUrl)

      // Step 3: Update profile with new banner URL
      console.log('💾 Step 3: Saving to database')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: data.publicUrl })
        .eq('id', user.id)
      
      if (updateError) throw updateError
      console.log('✅ Step 3: Database updated')

      // Clear upload state
      setBannerFile(null)
      setBannerPreview(null)
    } catch (error) {
      console.error('Error uploading banner:', error)
    }
  }

  const handleEditModeToggle = () => {
    if (!isEditMode) {
      setEditDisplayName(profile?.display_name || '')
      setEditUsername(profile?.username || '')
      setEditAboutMe(profile?.about_me || '')
      setDisplayNameError(null)
      setUsernameError(null)
    } else {
      // Reset avatar and banner to original state when canceling
      setAvatarFile(null)
      setAvatarPreview(null)
      setBannerFile(null)
      setBannerPreview(null)
    }
    setIsEditMode(!isEditMode)
  }

  const handleSaveProfile = async () => {
    if (!profile || !user) return

    if (!validateDisplayName(editDisplayName)) {
      return
    }

    try {
      setIsSaving(true)
      let xpEarned = 0
      let avatarXpAwarded = profile.avatar_xp_awarded || false
      let bannerXpAwarded = profile.banner_xp_awarded || false
      let aboutMeXpAwarded = profile.about_me_xp_awarded || false

      // Upload avatar if a new file was selected
      // Award XP only on first avatar change
      if (avatarFile) {
        await uploadAvatar()
        if (!avatarXpAwarded) {
          xpEarned += XP_CONFIG.profileEdits.avatar
          avatarXpAwarded = true
        }
      }

      // Upload banner if a new file was selected
      // Award XP only on first banner change
      if (bannerFile) {
        await uploadBanner()
        if (!bannerXpAwarded) {
          xpEarned += XP_CONFIG.profileEdits.banner
          bannerXpAwarded = true
        }
      }

      // Check if About Me actually changed from current value
      // Normalize both values to compare properly (null and '' are equivalent)
      const currentAboutMe = profile.about_me || ''
      const newAboutMe = editAboutMe || ''
      const aboutMeChanged = newAboutMe !== currentAboutMe
      
      // Award XP only on first about me change AND only if it was previously empty
      if (aboutMeChanged && !aboutMeXpAwarded && currentAboutMe === '') {
        xpEarned += XP_CONFIG.profileEdits.aboutMe
        aboutMeXpAwarded = true
      }

      const newXp = profile.xp + xpEarned
      const newLevel = getLevelFromXp(newXp).level
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editDisplayName,
          about_me: newAboutMe,
          xp: newXp,
          level: newLevel,
          avatar_xp_awarded: avatarXpAwarded,
          banner_xp_awarded: bannerXpAwarded,
          about_me_xp_awarded: aboutMeXpAwarded,
        })
        .eq('id', user.id)

      if (error) throw error

      // Refetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileData && !profileError) {
        setProfile(profileData)

        // Check if the profile owns any themes and specifically Ocean theme (id=1)
        try {
          const [{ count: themesCount, error: themesError } = {} as any] = [await supabase
            .from('user_owned_items')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profileData.id)
            .eq('item_type', 'themes')]

          setHasOwnedThemes(!(themesError) && (themesCount || 0) > 0)

          const { count: oceanCount, error: oceanError } = await supabase
            .from('user_owned_items')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profileData.id)
            .eq('item_type', 'themes')
            .eq('item_id', 1)

          setHasOceanOwned(!oceanError && (oceanCount || 0) > 0)
        } catch (err) {
          console.error('Error checking owned themes:', err)
          setHasOwnedThemes(false)
          setHasOceanOwned(false)
        }
        if (xpEarned > 0) {
          const rewards = []
          if (xpEarned >= XP_CONFIG.profileEdits.avatar) rewards.push('avatar')
          if (xpEarned >= XP_CONFIG.profileEdits.banner) rewards.push('banner')
          if (xpEarned >= XP_CONFIG.profileEdits.aboutMe) rewards.push('about me')
          console.log(`✨ First time bonuses! Earned ${xpEarned} XP from ${rewards.join(', ')}!`)
        }
      }

      setIsEditMode(false)
      setIsSaving(false)
    } catch (error) {
      console.error('Error saving profile:', error)
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Load allies for modal
  const loadAlliesForModal = async () => {
    if (!user) return
    setAlliesModalLoading(true)
    try {
      const { data: alliesData, error: alliesError } = await supabase
        .from('allies')
        .select('ally_id')
        .eq('user_id', user.id)
      
      console.log('Allies data:', alliesData, 'Error:', alliesError)
      
      if (alliesError || !alliesData || alliesData.length === 0) {
        console.log('No allies found')
        setAlliesForModal([])
        setAlliesModalLoading(false)
        return
      }

      const allyIds = alliesData.map(a => a.ally_id)
      console.log('Ally IDs:', allyIds)
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', allyIds)

      console.log('Profiles data:', profiles, 'Error:', profilesError)
      
      if (profilesError) {
        console.log('Error fetching profiles:', profilesError)
        setAlliesForModal([])
      } else {
        console.log('Setting allies for modal:', profiles)
        setAlliesForModal(profiles || [])
      }
    } catch (err) {
      console.error('Error loading allies for modal:', err)
      setAlliesForModal([])
    } finally {
      setAlliesModalLoading(false)
    }
  }

  // Load followers for modal
  const loadFollowersForModal = async () => {
    if (!user) return
    setFollowersModalLoading(true)
    try {
      const { data: followersData, error: followersError } = await supabase
        .from('followers')
        .select('follower_user_id')
        .eq('user_id', user.id)
        .is('unfollowed_at', null)
      
      console.log('Followers data:', followersData, 'Error:', followersError)
      
      if (followersError || !followersData || followersData.length === 0) {
        console.log('No followers found')
        setFollowersForModal([])
        setFollowersModalLoading(false)
        return
      }

      const followerIds = followersData.map(f => f.follower_user_id)
      console.log('Follower IDs:', followerIds)
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', followerIds)

      console.log('Profiles data:', profiles, 'Error:', profilesError)
      
      if (profilesError) {
        console.log('Error fetching profiles:', profilesError)
        setFollowersForModal([])
      } else {
        console.log('Setting followers for modal:', profiles)
        setFollowersForModal(profiles || [])
      }
    } catch (err) {
      console.error('Error loading followers for modal:', err)
      setFollowersForModal([])
    } finally {
      setFollowersModalLoading(false)
    }
  }

  // Fetch like and comment stats for a post
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
    const post = userPosts.find(p => p.id === postId)
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
    
    if (content.length > MAX_COMMENT_LENGTH) {
      alert(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`)
      return
    }

    // Check comment cooldown
    const isOnCooldown = await checkCommentCooldown()
    if (isOnCooldown) {
      alert(`⏱️ You've reached the comment limit (${XP_CONFIG.cooldowns.commentMax} comments per ${XP_CONFIG.cooldowns.commentPeriodsMinutes} minutes). Please try again later.`)
      return
    }
    
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
          .select('id, username, display_name, avatar_url')
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
        
        // Award XP for comment
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', user.id)
          .single()
        
        if (currentProfile) {
          const newXp = currentProfile.xp + XP_CONFIG.actions.comment
          const newLevel = getLevelFromXp(newXp).level
          await supabase
            .from('profiles')
            .update({ xp: newXp, level: newLevel })
            .eq('id', user.id)
          
          console.log(`✨ Earned ${XP_CONFIG.actions.comment} XP from commenting!`)
        }
        
        // Clear input
        setNewCommentText(prev => ({ ...prev, [postId]: '' }))
      }
    } catch (err) {
      console.error('Exception while adding comment:', err)
      alert('An error occurred while adding the comment.')
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
        .select('id, username, display_name, avatar_url')
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
        .select('id, username, display_name, avatar_url')
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
        .select('id, username, display_name, avatar_url')
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
        setUserPosts(userPosts.filter(post => post.id !== postId))
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

  const handleBlockUser = async () => {
    if (!user || !blockTarget?.id || isBlockingUser) return
    setIsBlockingUser(true)
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: blockTarget.id })
      if (error) {
        console.error('Error blocking user:', error)
        return
      }
      setShowBlockConfirmation(false)
      setBlockTarget(null)
      // remove posts from feed if applicable
      setUserPosts(prev => prev.filter(p => p.user_id !== blockTarget.id))
    } catch (err) {
      console.error('Error blocking user:', err)
    } finally {
      setIsBlockingUser(false)
    }
  }

  const togglePin = async (postId: string) => {
    if (!profile) return
    try {
      const currentPinned: string[] = Array.isArray(profile.pinned_posts) ? profile.pinned_posts : []
      // Enforce pin limit of 1
      if (!currentPinned.includes(postId) && currentPinned.length >= 1) {
        alert('You can only pin 1 post to your profile')
        return
      }
      let newPinned: string[]
      if (currentPinned.includes(postId)) {
        newPinned = currentPinned.filter(id => id !== postId)
      } else {
        newPinned = [postId, ...currentPinned.filter(id => id !== postId)]
      }
      const { error } = await supabase
        .from('profiles')
        .update({ pinned_posts: newPinned })
        .eq('id', profile.id)
      if (error) {
        console.error('Error updating pinned_posts:', error)
        return
      }
      setProfile(prev => prev ? { ...prev, pinned_posts: newPinned } : prev)
      // reorder posts locally
      setUserPosts(prev => {
        const postsById = new Map(prev.map(p => [p.id, p]))
        const pinnedOrdered: Post[] = []
        newPinned.forEach(id => { const m = postsById.get(id); if (m) pinnedOrdered.push(m) })
        const remaining = prev.filter(p => !newPinned.includes(p.id))
        return [...pinnedOrdered, ...remaining]
      })
      window.dispatchEvent(new Event('pinnedPostsChanged'))
    } catch (err) {
      console.error('Exception toggling pin:', err)
    }
  }

  // Fetch user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData?.session) {
          router.push('/login')
          return
        }

        const session = sessionData.session
        setUser(session.user)

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData)
          // Check owned themes (initial load)
          try {
            const { count: themesCount, error: themesError } = await supabase
              .from('user_owned_items')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', profileData.id)
              .eq('item_type', 'themes')

            setHasOwnedThemes(!themesError && (themesCount || 0) > 0)

            const { count: oceanCount, error: oceanError } = await supabase
              .from('user_owned_items')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', profileData.id)
              .eq('item_type', 'themes')
              .eq('item_id', 1)

            setHasOceanOwned(!oceanError && (oceanCount || 0) > 0)
          } catch (err) {
            console.error('Error checking owned themes on initial load:', err)
            setHasOwnedThemes(false)
            setHasOceanOwned(false)
          }
        }

        // Fetch follower count
        const { count: followerCountData, error: followerCountError } = await supabase
          .from('followers')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .is('unfollowed_at', null)
        
        if (!followerCountError) {
          setFollowerCount(followerCountData || 0)
        }

        // Fetch allies count
        const { count: alliesCountData, error: alliesCountError } = await supabase
          .from('allies')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
        
        if (!alliesCountError) {
          setAlliesCount(alliesCountData || 0)
        }

        // Fetch ally request count
        try {
          const response = await fetch('/api/get-ally-request-count')
          if (response.ok) {
            const data = await response.json()
            setAllyRequestCount(data.count || 0)
          }
        } catch (err) {
          console.error('Error fetching ally request count:', err)
        }

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
        
        if (!postsError && postsData) {
          // If this profile has pinned_posts, order them on top (latest pinned first)
          const pinnedIds: string[] = Array.isArray(profileData.pinned_posts) ? profileData.pinned_posts : []
          const postsById = new Map(postsData.map((p: Post) => [p.id, p]))
          const pinnedOrdered: Post[] = []
          // pinned_posts is ordered with newest pin first (we insert new pins at front)
          pinnedIds.forEach(id => {
            const matched = postsById.get(id)
            if (matched) pinnedOrdered.push(matched)
          })
          const remaining = postsData.filter((p: Post) => !pinnedIds.includes(p.id))
          const ordered = [...pinnedOrdered, ...remaining]

          setUserPosts(ordered)
          
          // Initialize likeStates and fetch actual stats
          const initialLikeStates: Record<string, { isLiked: boolean; count: number }> = {}
          postsData.forEach(post => {
            initialLikeStates[post.id] = { isLiked: false, count: 0 }
          })
          setLikeStates(initialLikeStates)
          
          // Fetch actual stats for all posts
          postsData.forEach(post => {
            fetchPostStats(post.id, session.user.id)
          })
        }
      } catch (err) {
        console.error('Error:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  // Refetch profile when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Page became visible, refetch profile to get latest XP
        const refetchProfile = async () => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileData) {
            setProfile(profileData)
            console.log('Profile refetched on visibility change:', profileData)

            // refetch posts and respect pinned_posts ordering
            const { data: postsData } = await supabase
              .from('posts')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })

            if (postsData) {
              const pinnedIds: string[] = Array.isArray(profileData.pinned_posts) ? profileData.pinned_posts : []
              const postsById = new Map(postsData.map((p: Post) => [p.id, p]))
              const pinnedOrdered: Post[] = []
              pinnedIds.forEach(id => {
                const matched = postsById.get(id)
                if (matched) pinnedOrdered.push(matched)
              })
              const remaining = postsData.filter((p: Post) => !pinnedIds.includes(p.id))
              setUserPosts([...pinnedOrdered, ...remaining])
            }
          }
        }
        refetchProfile()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, supabase])

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

  // Listen for pinned posts changes (from other pages) and refresh posts order
  useEffect(() => {
    const handler = async () => {
      if (!user) return
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          // Refetch posts and reorder
          const { data: postsData } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (postsData) {
            const pinnedIds: string[] = Array.isArray(profileData.pinned_posts) ? profileData.pinned_posts : []
            const postsById = new Map(postsData.map((p: Post) => [p.id, p]))
            const pinnedOrdered: Post[] = []
            pinnedIds.forEach(id => {
              const matched = postsById.get(id)
              if (matched) pinnedOrdered.push(matched)
            })
            const remaining = postsData.filter((p: Post) => !pinnedIds.includes(p.id))
            setUserPosts([...pinnedOrdered, ...remaining])
          }
        }
      } catch (err) {
        console.error('Error refreshing pinned posts:', err)
      }
    }

    window.addEventListener('pinnedPostsChanged', handler)
    return () => window.removeEventListener('pinnedPostsChanged', handler)
  }, [user, supabase])

  // Real-time ally request count subscription
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

    fetchAllyRequestCount()

    const subscription = supabase
      .channel(`ally-requests-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ally_requests',
          filter: `receiver_id=eq.${user.id}`,
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

  if (loading) {
    return <GlobalLoading />
  }

  return (
    <div className="min-h-screen bg-[#181818]">
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
                      } else if (item.id === 'collections') {
                        router.push('/collections')
                      } else if (item.id === 'settings') {
                        router.push('/settings')
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

        {/* Main Content */}
        {profile && (
          <div className="flex-1 overflow-y-auto">
            <div
              className="relative overflow-hidden"
              style={hasOceanTheme ? oceanBgStyle : hasSunsetTheme ? sunsetBgStyle : hasGalaxyTheme ? galaxyBgStyle : { backgroundColor: '#181818' }}
            >
              {(hasOceanTheme || hasSunsetTheme || hasGalaxyTheme) && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}
              <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
                
                {/* Banner */}
                {bannerPreview ? (
                  <div className="relative w-full h-48 sm:h-64 rounded-2xl mb-6 overflow-hidden">
                    <img 
                      src={bannerPreview} 
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                    {isEditMode && (
                      <label className="absolute inset-0 rounded-2xl bg-black/50 hover:bg-black/60 flex items-center justify-center cursor-pointer transition-colors">
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <Camera size={20} />
                          Change Banner
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                ) : profile.banner_url && profile.banner_url.trim() ? (
                  <div className="relative w-full h-48 sm:h-64 rounded-2xl mb-6 overflow-hidden">
                    <img 
                      src={profile.banner_url} 
                      alt="Profile banner"
                      className="w-full h-full object-cover"
                    />
                    {isEditMode && (
                      <label className="absolute inset-0 rounded-2xl bg-black/50 hover:bg-black/60 flex items-center justify-center cursor-pointer transition-colors">
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <Camera size={20} />
                          Change Banner
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className={`relative w-full h-48 sm:h-64 bg-gradient-to-br ${profile.banner_gradient} rounded-2xl mb-6`}>
                    {isEditMode && (
                      <label className="absolute inset-0 rounded-2xl bg-black/50 hover:bg-black/60 flex items-center justify-center cursor-pointer transition-colors">
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <Camera size={20} />
                          Add Banner
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Profile Header Section */}
                <div className="mb-12">
                  {/* Main Row: Avatar (overlapping), Info, and Stats */}
                  <div className="flex gap-6 items-start">
                    {/* Avatar - Overlaps banner independently */}
                    <div className="relative -mt-24 flex-shrink-0">
                      <div className="relative w-fit">
                        {avatarPreview ? (
                          <img 
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border-4 border-[#181818] shadow-lg"
                          />
                        ) : profile && user ? (
                          <AvatarWithFrame
                            src={profile.avatar_url}
                            alt={profile.username}
                            equippedFrame={profile.equipped_frame}
                            size="xxl"
                            frameScale={1.35}
                          />
                        ) : (
                          <div className='w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gray-600 flex items-center justify-center border-4 border-[#181818] shadow-lg user-select-none pointer-events-none avatar-placeholder' draggable={false}>
                            <span className='text-4xl sm:text-5xl font-bold text-white'>?</span>
                          </div>
                        )}
                        {isEditMode && (
                          <label className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors">
                            <Camera size={32} className="text-white" />
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleAvatarChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                      {isEditMode ? (
                        <div className="space-y-3 max-w-sm">
                          <div
                            className="relative overflow-hidden"
                            style={hasOceanTheme ? oceanBgStyle : hasSunsetTheme ? sunsetBgStyle : hasGalaxyTheme ? galaxyBgStyle : { backgroundColor: '#181818' }}
                          >
                            {(hasOceanTheme || hasSunsetTheme || hasGalaxyTheme) && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}
                            <input
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              maxLength={25}
                              placeholder="Display Name"
                              className="w-full bg-[#252525] border border-gray-700 text-white text-2xl font-bold px-3 py-2 rounded-lg focus:outline-none focus:border-[#ff4234]"
                            />
                            {displayNameError && <p className="text-red-500 text-xs mt-1">{displayNameError}</p>}
                            <p className="text-gray-500 text-xs mt-1">{editDisplayName.length}/25</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">{profile.display_name || profile.username}</h1>
                          <p className={`${((profile as any)?.equipped_theme === 1 || (profile as any)?.equipped_theme === 2 || (profile as any)?.equipped_theme === 3) ? 'text-white' : 'text-gray-400'} text-lg mb-3`}>@{profile.username}</p>
                          <div className="flex items-center gap-4 mb-4">
                            <p className={`${((profile as any)?.equipped_theme === 1 || (profile as any)?.equipped_theme === 2 || (profile as any)?.equipped_theme === 3) ? 'text-white' : 'text-gray-500'} text-sm`}>
                              Member since {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                            <div className={"flex items-center gap-2 " + (((profile as any)?.equipped_theme === 1) ? 'bg-[#4aa4ff]/10' : ((profile as any)?.equipped_theme === 2 ? 'bg-[#ff9a42]/10' : ((profile as any)?.equipped_theme === 3 ? 'bg-[#fc386f]/10' : 'bg-[#ff4234]/10'))) + " px-3 py-1 rounded-full"}>
                              <span className={((profile as any)?.equipped_theme === 1) ? 'text-[#4aa4ff] font-bold' : ((profile as any)?.equipped_theme === 2) ? 'text-[#ff9a42] font-bold' : ((profile as any)?.equipped_theme === 3) ? 'text-[#fc386f] font-bold' : 'text-[#ff4234] font-bold'}>⭐</span>
                              <span className={((profile as any)?.equipped_theme === 1) ? 'text-[#4aa4ff] font-semibold text-sm' : ((profile as any)?.equipped_theme === 2) ? 'text-[#ff9a42] font-semibold text-sm' : ((profile as any)?.equipped_theme === 3) ? 'text-[#fc386f] font-semibold text-sm' : 'text-[#ff4234] font-semibold text-sm'}>Level {getLevelFromXp(profile.xp).level}</span>
                            </div>
                          </div>
                          {/* XP Bar */}
                          <div className="w-full max-w-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className={`${((profile as any)?.equipped_theme === 1 || (profile as any)?.equipped_theme === 2 || (profile as any)?.equipped_theme === 3) ? 'text-white' : 'text-gray-400'} text-xs`}>{getLevelFromXp(profile.xp).currentLevelXp} / {getLevelFromXp(profile.xp).nextLevelXp} XP</span>
                              <span className={`${((profile as any)?.equipped_theme === 1 || (profile as any)?.equipped_theme === 2 || (profile as any)?.equipped_theme === 3) ? 'text-white' : 'text-gray-500'} text-xs`}>{getLevelFromXp(profile.xp).progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                              <div 
                                className={((profile as any)?.equipped_theme === 1)
                                  ? 'bg-gradient-to-r from-[#4aa4ff] to-[#3b8fe0] h-full rounded-full transition-all duration-300'
                                  : ((profile as any)?.equipped_theme === 2)
                                    ? 'bg-gradient-to-r from-[#ff9a42] to-[#ffbf80] h-full rounded-full transition-all duration-300'
                                    : ((profile as any)?.equipped_theme === 3)
                                      ? 'bg-gradient-to-r from-[#fc386f] to-[#ff8ab0] h-full rounded-full transition-all duration-300'
                                      : 'bg-gradient-to-r from-[#ff4234] to-[#ff6b52] h-full rounded-full transition-all duration-300'}
                                style={{ width: `${getLevelFromXp(profile.xp).progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Stats - Right but closer */}
                    <div className="flex flex-row gap-4 flex-shrink-0">
                      <button 
                        onClick={() => postsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="text-center hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <p className={"text-4xl sm:text-5xl font-bold " + (((profile as any)?.equipped_theme === 1) ? 'text-[#4aa4ff]' : ((profile as any)?.equipped_theme === 2 ? 'text-[#ff9a42]' : ((profile as any)?.equipped_theme === 3 ? 'text-[#fc386f]' : 'text-[#ff4234]')))}>{userPosts.length}</p>
                        <p className={`${((profile as any)?.equipped_theme === 1 || (profile as any)?.equipped_theme === 2 || (profile as any)?.equipped_theme === 3) ? 'text-white' : 'text-gray-400'} text-sm`}>Posts</p>
                      </button>
                      <button 
                        onClick={() => {
                          setAlliesModalOpen(true)
                          setAlliesModalSearchQuery('')
                          loadAlliesForModal()
                        }}
                        className="text-center hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <p className={"text-4xl sm:text-5xl font-bold " + (((profile as any)?.equipped_theme === 1) ? 'text-[#4aa4ff]' : ((profile as any)?.equipped_theme === 2 ? 'text-[#ff9a42]' : ((profile as any)?.equipped_theme === 3 ? 'text-[#fc386f]' : 'text-[#ff4234]')))}>{alliesCount}</p>
                        <p className={`${((profile as any)?.equipped_theme === 1 || (profile as any)?.equipped_theme === 2 || (profile as any)?.equipped_theme === 3) ? 'text-white' : 'text-gray-400'} text-sm`}>Allies</p>
                      </button>
                      <button 
                        onClick={() => {
                          setFollowersModalOpen(true)
                          setFollowersModalSearchQuery('')
                          loadFollowersForModal()
                        }}
                        className="text-center hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <p className={"text-4xl sm:text-5xl font-bold " + (((profile as any)?.equipped_theme === 1) ? 'text-[#4aa4ff]' : ((profile as any)?.equipped_theme === 2 ? 'text-[#ff9a42]' : ((profile as any)?.equipped_theme === 3 ? 'text-[#fc386f]' : 'text-[#ff4234]')))}>{followerCount}</p>
                        <p className={`${((profile as any)?.equipped_theme === 1 || (profile as any)?.equipped_theme === 2 || (profile as any)?.equipped_theme === 3) ? 'text-white' : 'text-gray-400'} text-sm`}>Followers</p>
                      </button>
                    </div>
                  </div>

                  {/* Edit Profile Button */}
                  <div className="mt-8 flex gap-2">
                    {isEditMode ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSaving || displayNameError !== null}
                          className="bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 disabled:bg-gray-600 text-sm"
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleEditModeToggle}
                          disabled={isSaving}
                          className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleEditModeToggle}
                        className={`${(profile as any)?.equipped_theme === 1 ? 'bg-[#4aa4ff] hover:bg-[#3b8fe0]' : ( (profile as any)?.equipped_theme === 2 ? 'bg-[#ff9a42] hover:bg-[#ff8b3a]' : ((profile as any)?.equipped_theme === 3 ? 'bg-[#fc386f] hover:bg-[#e62f63]' : 'bg-[#ff4234] hover:bg-red-600'))} text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 text-sm`}
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>

                {/* About Me Section */}
                {isEditMode ? (
                  <div className="mb-12">
                    <h3 className="text-lg font-bold text-white mb-3">About Me</h3>
                    <textarea
                      value={editAboutMe}
                      onChange={(e) => setEditAboutMe(e.target.value)}
                      maxLength={150}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className={`w-full bg-[#252525] border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#ff4234] resize-none`}
                    />
                    <p className="text-gray-500 text-xs mt-1">{editAboutMe.length}/150</p>
                  </div>
                ) : (
                  <>
                    {profile.about_me && (
                      <div className="mb-12 pb-6 border-b border-gray-800">
                        <h3 className="text-lg font-bold text-white mb-3">About Me</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">{profile.about_me}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Posts Feed - Grid Layout */}
                <div className="pb-12" ref={postsRef}>
                  <h2 className="text-2xl font-bold text-white mb-6">Posts</h2>
                  {userPosts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-lg">No posts yet</p>
                      <p className="text-sm mt-2">Create your first post to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {userPosts.map((post) => {
                        const postDate = new Date(post.created_at)
                        const formattedDate = postDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                        
                        return (
                          <div
                            key={post.id}
                            className={`${hasOceanOwned ? 'bg-[#1f1f1f]/60' : 'bg-[#1f1f1f]'} rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors`}
                          >
                            {/* Post Header */}
                            <div className="p-5">
                              <div className="flex items-start gap-3 mb-4 relative" onMouseEnter={() => setHoveredPostId(post.id)} onMouseLeave={() => setHoveredPostId(null)}>
                                {profile?.avatar_url && profile.avatar_url.trim() ? (
                                  <img 
                                    src={profile.avatar_url} 
                                    alt={profile.username}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-700"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0 border border-gray-700 user-select-none pointer-events-none avatar-placeholder" draggable={false}>
                                    <span className='text-sm font-bold text-white'>?</span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-semibold text-sm">{profile?.display_name || profile?.username}</h4>
                                  <p className="text-gray-500 text-xs">@{profile?.username} · {formattedDate}</p>
                                </div>
                                
                                {/* Pinned badge */}
                                {profile?.pinned_posts && profile.pinned_posts.includes(post.id) && (
                                  <div className="ml-2 flex items-center gap-2 text-xs bg-[#2a2a2a] text-gray-300 px-2 py-0.5 rounded-full">
                                    <Pin size={14} />
                                    <span className="font-medium">Pinned</span>
                                  </div>
                                )}

                                {/* Three dots menu - appears on hover */}
                                {hoveredPostId === post.id && (
                                  <div className="relative ml-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
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
                                  <video
                                    src={post.media_url}
                                    controls
                                    className="w-full h-auto object-cover"
                                  />
                                ) : (
                                  <img
                                    src={post.media_url}
                                    alt="Post media"
                                    className="w-full h-auto object-cover"
                                  />
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
                              </div>
                            </div>

                            {/* Comments Section */}
                            {expandedCommentsPostId === post.id && (
                              <div className="border-t border-gray-800 bg-[#252525]/50">
                                {/* Comments List */}
                                <div className="px-5 py-4 max-h-96 overflow-y-auto">
                                  {loadingComments[post.id] ? (
                                    <div className="text-center text-gray-400 text-sm py-4">Loading comments...</div>
                                  ) : (postComments[post.id] || []).length === 0 ? (
                                    <div className="text-center text-gray-500 text-sm py-4">No comments yet</div>
                                  ) : (
                                    <div className="space-y-3">
                                      {postComments[post.id]?.map(comment => (
                                        <div key={comment.id} className="flex gap-3">
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
                                            {comment.profiles?.avatar_url ? (
                                              <img
                                                src={comment.profiles.avatar_url}
                                                alt={comment.profiles?.username}
                                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-700 hover:border-red-500 transition-colors"
                                                draggable={false}
                                              />
                                            ) : (
                                              <div className="w-8 h-8 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0 border border-gray-700 hover:border-red-500 transition-colors">
                                                <span className="text-xs font-bold text-white">?</span>
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <span className="text-white text-sm font-semibold hover:text-red-500 transition-colors">
                                                {comment.profiles?.display_name || comment.profiles?.username}
                                              </span>
                                              <span className="text-gray-500 text-xs hover:text-red-500/70 transition-colors">@{comment.profiles?.username}</span>
                                            </div>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2" />
                                              {comment.user_id === user?.id && (
                                                <button
                                                  onClick={() => deleteComment(comment.id, post.id)}
                                                  className="text-red-500 hover:text-red-400 transition-colors"
                                                  title="Delete comment"
                                                >
                                                  <X size={16} />
                                                </button>
                                              )}
                                            </div>
                                            <p className="text-gray-300 text-sm mt-1 break-words">{comment.content}</p>
                                            <div className="flex items-center justify-between mt-2">
                                              <span className="text-gray-600 text-xs">
                                                {new Date(comment.created_at).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </span>
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
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Load More Comments Button */}
                                {(commentsLoadedCount[post.id] || 0) < (totalCommentsCount[post.id] || 0) && (
                                  <div className="px-5 py-3 text-center border-t border-gray-800">
                                    <button
                                      onClick={() => fetchPostComments(post.id, true)}
                                      disabled={loadingComments[post.id]}
                                      className="text-blue-500 hover:text-blue-400 text-sm font-medium disabled:opacity-50"
                                    >
                                      {loadingComments[post.id] ? 'Loading...' : `Load more comments (${(totalCommentsCount[post.id] || 0) - (commentsLoadedCount[post.id] || 0)} remaining)`}
                                    </button>
                                  </div>
                                )}

                                {/* Comment Input */}
                                <div className="px-5 py-4 border-t border-gray-800">
                                  <div className="flex gap-3 mb-3">
                                    {profile?.avatar_url && profile.avatar_url.trim() ? (
                                      <img
                                        src={profile.avatar_url}
                                        alt={profile.username}
                                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-700"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0 border border-gray-700 user-select-none pointer-events-none avatar-placeholder" draggable={false}>
                                        <span className="text-xs font-bold text-white">?</span>
                                      </div>
                                    )}
                                    <div className="flex-1 flex gap-2">
                                      <textarea
                                        placeholder="Add a comment (max 1000 characters)..."
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
                                        disabled={!newCommentText[post.id]?.trim() || (newCommentText[post.id]?.length || 0) > 1000}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                                      >
                                        Post
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex justify-end text-xs text-gray-500 px-11">
                                    {newCommentText[post.id]?.length || 0} / 1000
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
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

        {/* Right Sidebar - Allies */}
        <RightSidebar allies={allies} />

        {/* Global fixed-position dropdown for post options */}
        {openMenuPostId && menuPosition && (
          <div ref={menuRef} style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, width: 200 }} className="z-50">
            <div className="bg-[#252525] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
              {/* Owner options (this is owner's profile) */}
              <>
                <button onClick={(e) => { e.stopPropagation(); handleCopyLink(openMenuPostId) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] text-left">
                  <Link size={18} />
                  <span>{copiedLinkPostId === openMenuPostId ? 'Copied!' : 'Copy Link'}</span>
                </button>

                {/* Pin button - disabled if another pin already exists */}
                <button
                  onClick={(e) => { e.stopPropagation(); if (!(Array.isArray(profile?.pinned_posts) && !profile.pinned_posts.includes(openMenuPostId) && profile.pinned_posts.length >= 1)) togglePin(openMenuPostId) }}
                  disabled={Array.isArray(profile?.pinned_posts) && !profile.pinned_posts.includes(openMenuPostId) && profile.pinned_posts.length >= 1}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-gray-300 text-left ${Array.isArray(profile?.pinned_posts) && !profile.pinned_posts.includes(openMenuPostId) && profile.pinned_posts.length >= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a2a2a]'}`}
                >
                  <Pin size={18} />
                  <span>{profile?.pinned_posts && profile.pinned_posts.includes(openMenuPostId) ? 'Unpin from My Profile' : 'Pin to My Profile'}</span>
                </button>

                <button onClick={(e) => { e.stopPropagation(); openStatsModal(openMenuPostId) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] text-left">
                  <BarChart size={18} />
                  <span>View Stats</span>
                </button>

                <div className="border-t border-gray-700"></div>

                <button onClick={(e) => { e.stopPropagation(); const p = userPosts.find(p => p.id === openMenuPostId); setPostToDelete(p || null); setDeleteModalOpen(true); setOpenMenuPostId(null) }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] text-left">
                  <Trash2 size={18} />
                  <span>Delete Post</span>
                </button>
              </>
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

        {/* Allies Modal */}
        {alliesModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl max-w-sm w-full mx-4 border border-gray-800 flex flex-col max-h-96">
              {/* Header */}
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Allies of {profile?.display_name || profile?.username}</h2>
                <button
                  onClick={() => {
                    setAlliesModalOpen(false)
                    setAlliesModalSearchQuery('')
                    setAlliesForModal([])
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
                  placeholder="Search allies..."
                  value={alliesModalSearchQuery}
                  onChange={(e) => setAlliesModalSearchQuery(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Allies List */}
              <div className="overflow-y-auto flex-1">
                {alliesModalLoading ? (
                  <div className="p-6 text-center text-gray-400">
                    <span>Loading...</span>
                  </div>
                ) : alliesForModal.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <span>No allies yet</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {alliesForModal
                      .filter(allyProfile => {
                        const searchLower = alliesModalSearchQuery.toLowerCase()
                        return (
                          allyProfile.username.toLowerCase().includes(searchLower) ||
                          (allyProfile.display_name && allyProfile.display_name.toLowerCase().includes(searchLower))
                        )
                      })
                      .map(allyProfile => (
                        <div
                          key={allyProfile.id}
                          className="p-4 flex items-center gap-3 hover:bg-[#252525] transition-colors cursor-pointer"
                          onClick={() => {
                            if (allyProfile.id === user?.id) {
                              router.push('/profile')
                            } else {
                              router.push(`/profile/${allyProfile.username}`)
                            }
                            setAlliesModalOpen(false)
                          }}
                        >
                          {allyProfile.avatar_url ? (
                            <img
                              src={allyProfile.avatar_url}
                              alt={allyProfile.username}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0 border border-gray-700">
                              <span className="text-xs font-bold text-white">?</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-sm">
                              {allyProfile.display_name || allyProfile.username}
                            </h4>
                            <p className="text-gray-500 text-xs">@{allyProfile.username}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Followers Modal */}
        {followersModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl max-w-sm w-full mx-4 border border-gray-800 flex flex-col max-h-96">
              {/* Header */}
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Followers of {profile?.display_name || profile?.username}</h2>
                <button
                  onClick={() => {
                    setFollowersModalOpen(false)
                    setFollowersModalSearchQuery('')
                    setFollowersForModal([])
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
                  placeholder="Search followers..."
                  value={followersModalSearchQuery}
                  onChange={(e) => setFollowersModalSearchQuery(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Followers List */}
              <div className="overflow-y-auto flex-1">
                {followersModalLoading ? (
                  <div className="p-6 text-center text-gray-400">
                    <span>Loading...</span>
                  </div>
                ) : followersForModal.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <span>No followers yet</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {followersForModal
                      .filter(followerProfile => {
                        const searchLower = followersModalSearchQuery.toLowerCase()
                        return (
                          followerProfile.username.toLowerCase().includes(searchLower) ||
                          (followerProfile.display_name && followerProfile.display_name.toLowerCase().includes(searchLower))
                        )
                      })
                      .map(followerProfile => (
                        <div
                          key={followerProfile.id}
                          className="p-4 flex items-center gap-3 hover:bg-[#252525] transition-colors cursor-pointer"
                          onClick={() => {
                            if (followerProfile.id === user?.id) {
                              router.push('/profile')
                            } else {
                              router.push(`/profile/${followerProfile.username}`)
                            }
                            setFollowersModalOpen(false)
                          }}
                        >
                          {followerProfile.avatar_url ? (
                            <img
                              src={followerProfile.avatar_url}
                              alt={followerProfile.username}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0 border border-gray-700">
                              <span className="text-xs font-bold text-white">?</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-sm">
                              {followerProfile.display_name || followerProfile.username}
                            </h4>
                            <p className="text-gray-500 text-xs">@{followerProfile.username}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
