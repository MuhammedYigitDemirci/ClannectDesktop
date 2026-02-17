'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Home, Zap, Users, Plus, User, Settings, LogOut, ChevronRight, ShoppingCart, Ban, Bookmark } from 'lucide-react'
import RightSidebar from '../components/RightSidebar'
import ChangeUsernameModal from '../components/ChangeUsernameModal'
import AvatarWithFrame from '../components/AvatarWithFrame'
import GlobalLoading from '../components/GlobalLoading'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSidebarTab, setActiveSidebarTab] = useState('settings')
  const [activeTab, setActiveTab] = useState('accounts')
  const [allies, setAllies] = useState<any[]>([])
  const [allyRequestCount, setAllyRequestCount] = useState(0)
  
  // Change Username Modal States
  const [usernameModalOpen, setUsernameModalOpen] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameCooldownExpiresAt, setUsernameCooldownExpiresAt] = useState<string | null>(null)
  const [daysUntilUsernameChange, setDaysUntilUsernameChange] = useState(0)
  
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccessOpen, setPasswordSuccessOpen] = useState(false)
  const [dmPermissions, setDmPermissions] = useState('everyone')
  const [allyRequestPermissions, setAllyRequestPermissions] = useState('everyone')
  const [privacySaveLoading, setPrivacySaveLoading] = useState(false)
  const [privacySaveError, setPrivacySaveError] = useState('')
  const [privacySaveSuccess, setPrivacySaveSuccess] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(false)
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null)
  const [theme, setTheme] = useState('system')
  const [appearanceSaveLoading, setAppearanceSaveLoading] = useState(false)
  const [appearanceSaveError, setAppearanceSaveError] = useState('')
  const [appearanceSaveSuccess, setAppearanceSaveSuccess] = useState(false)
  const [fontSize, setFontSize] = useState('medium')
  const userIdRef = useRef<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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

  const handleChangeUsername = async (newUsername: string) => {
    try {
      if (!newUsername.trim()) {
        setUsernameError('Please enter a new username')
        return
      }

      // Validate username format (3-20 characters, alphanumeric and underscores)
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
      if (!usernameRegex.test(newUsername)) {
        setUsernameError('Username must be 3-20 characters, alphanumeric and underscores only')
        return
      }

      if (newUsername === profile?.username) {
        setUsernameError('New username must be different from current username')
        return
      }

      setUsernameLoading(true)
      setUsernameError('')

      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername)
        .single()

      if (existingUser) {
        setUsernameError('This username is already taken')
        setUsernameLoading(false)
        return
      }

      // Calculate cooldown expiry (7 days from now)
      const now = new Date()
      const cooldownExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      // Update username and set cooldown in profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          username: newUsername,
          username_change_cooldown_expires_at: cooldownExpiresAt.toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating username:', updateError)
        setUsernameError(updateError.message || 'Failed to update username')
        setUsernameLoading(false)
        return
      }

      // Success - update local state
      setProfile({ ...profile, username: newUsername })
      setUsernameCooldownExpiresAt(cooldownExpiresAt.toISOString())
      setDaysUntilUsernameChange(7)
      setUsernameError('')
      setUsernameModalOpen(false)
      
    } catch (err) {
      console.error('Error changing username:', err)
      setUsernameError('An error occurred while changing your username. Please try again.')
    } finally {
      setUsernameLoading(false)
    }
  }

  const handleChangeEmail = async () => {
    try {
      if (!newEmail.trim()) {
        setEmailError('Please enter a new email address')
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newEmail)) {
        setEmailError('Please enter a valid email address')
        return
      }

      if (newEmail === profile?.email) {
        setEmailError('This email is already connected to this account!')
        return
      }

      setEmailLoading(true)
      setEmailError('')

      // Use updateUser which sends a confirmation email to the new address.
      // Provide `emailRedirectTo` so Supabase will include a return link to our app.
      const { error } = await supabase.auth.updateUser(
        {
          email: newEmail,
        },
        {
          emailRedirectTo: 'https://app.clannect.com/auth/verified',
        }
      )

      if (error) {
        console.error('Error updating email:', error)
        // Provide more specific error messages
        if (error.message.includes('already registered')) {
          setEmailError('This email is already registered')
        } else if (error.message.includes('invalid email')) {
          setEmailError('Invalid email address')
        } else {
          setEmailError(error.message || 'Failed to update email. A confirmation link has been sent to your new email if it was valid.')
        }
        return
      }

      // Success - show confirmation message
      setEmailError('') // Clear any errors
      setEmailModalOpen(false)
      setNewEmail('')
      
      // Show success message in UI
      alert('A confirmation link has been sent to your new email address. Please check your email and click the verification link to complete the email change. You will be redirected to a confirmation page once verified.')

    } catch (err) {
      console.error('Error updating email:', err)
      setEmailError('An error occurred while updating your email. Please try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError('Please fill in all fields')
        return
      }

      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match')
        return
      }

      if (newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters long')
        return
      }

      // Check password strength - at least one uppercase, one number
      const hasUppercase = /[A-Z]/.test(newPassword)
      const hasNumber = /[0-9]/.test(newPassword)
      if (!hasUppercase || !hasNumber) {
        setPasswordError('Password must contain at least one uppercase letter and one number')
        return
      }

      if (newPassword === currentPassword) {
        setPasswordError('New password must be different from current password')
        return
      }

      setPasswordLoading(true)
      setPasswordError('')

      // Verify current password via a server endpoint to avoid interfering with
      // the user's existing client session. The server calls Supabase's token
      // endpoint to validate credentials.
      const verifyRes = await fetch('/api/verify-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: currentPassword }),
      })

      if (!verifyRes.ok) {
        const vjson = await verifyRes.json().catch(() => ({}))
        console.error('Password verification failed:', vjson)
        setPasswordError('Current password is incorrect. Please try again.')
        setPasswordLoading(false)
        return
      }

      // Now update to the new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        console.error('Error updating password:', updateError)
        if (updateError.message.includes('same password')) {
          setPasswordError('New password cannot be the same as your current password')
        } else {
          setPasswordError(updateError.message || 'Failed to update password. Please try again.')
        }
        return
      }

      // Success - close modal and reset all fields
      setPasswordModalOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
      
      // Show success modal
      setPasswordSuccessOpen(true)

      // Send password change notification to the user's email via server route
      try {
        await fetch('/api/send-password-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user?.email || profile?.email }),
        })
      } catch (notifyErr) {
        console.error('Failed to send password notification:', notifyErr)
      }

    } catch (err) {
      console.error('Exception during password change:', err)
      setPasswordError('An unexpected error occurred. Please try again.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSaveAppearanceSettings = async () => {
    try {
      setAppearanceSaveLoading(true)
      setAppearanceSaveError('')

      if (!user?.id) {
        setAppearanceSaveError('User not authenticated')
        return
      }

      // First, try to fetch existing settings
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('user_settings')
          .update({
            theme: theme,
            font_size: fontSize,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        if (error) {
          console.error('Error updating appearance settings:', error)
          setAppearanceSaveError(error.message || 'Failed to save settings')
          return
        }
      } else {
        // Insert new settings if they don't exist
        const { error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            theme: theme,
            font_size: fontSize,
          })

        if (error) {
          console.error('Error inserting appearance settings:', error)
          setAppearanceSaveError(error.message || 'Failed to save settings')
          return
        }
      }

      // Apply theme and font size to DOM
      applyTheme(theme)
      applyFontSize(fontSize)

      setAppearanceSaveSuccess(true)
      setTimeout(() => setAppearanceSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving appearance settings:', err)
      setAppearanceSaveError('An error occurred while saving your settings')
    } finally {
      setAppearanceSaveLoading(false)
    }
  }

  const applyTheme = (selectedTheme: string) => {
    const root = document.documentElement
    const isDark = selectedTheme === 'dark' || (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    // Store in localStorage
    localStorage.setItem('theme', selectedTheme)
  }

  const applyFontSize = (size: string) => {
    const root = document.documentElement
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large')
    root.classList.add(`font-size-${size}`)
    localStorage.setItem('fontSize', size)
  }

  const handleSavePrivacySettings = async () => {
    try {
      setPrivacySaveLoading(true)
      setPrivacySaveError('')

      if (!user?.id) {
        setPrivacySaveError('User not authenticated')
        return
      }

      // First, try to fetch existing settings
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('user_settings')
          .update({
            dm_permissions: dmPermissions,
            ally_request_permissions: allyRequestPermissions,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        if (error) {
          console.error('Error updating privacy settings:', error)
          setPrivacySaveError(error.message || 'Failed to save settings')
          return
        }
      } else {
        // Insert new settings if they don't exist
        const { error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            dm_permissions: dmPermissions,
            ally_request_permissions: allyRequestPermissions,
          })

        if (error) {
          console.error('Error inserting privacy settings:', error)
          setPrivacySaveError(error.message || 'Failed to save settings')
          return
        }
      }

      setPrivacySaveSuccess(true)
      setTimeout(() => setPrivacySaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving privacy settings:', err)
      setPrivacySaveError('An error occurred while saving your settings')
    } finally {
      setPrivacySaveLoading(false)
    }
  }

  // Fetch blocked users
  const fetchBlockedUsers = async (userId: string) => {
    try {
      setBlockedUsersLoading(true)

      // Get all users I blocked
      const { data: blockedUserIds, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', userId)

      if (error) {
        console.error('Error fetching blocked users:', error)
        setBlockedUsers([])
        return
      }

      if (!blockedUserIds || blockedUserIds.length === 0) {
        setBlockedUsers([])
        return
      }

      // Fetch profiles of blocked users
      const ids = blockedUserIds.map(b => b.blocked_id)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, equipped_frame')
        .in('id', ids)

      if (profileError) {
        console.error('Error fetching blocked user profiles:', profileError)
        setBlockedUsers([])
        return
      }

      setBlockedUsers(profiles || [])
    } catch (err) {
      console.error('Error in fetchBlockedUsers:', err)
      setBlockedUsers([])
    } finally {
      setBlockedUsersLoading(false)
    }
  }

  // Unblock a user
  const handleUnblockUser = async (blockedUserId: string) => {
    try {
      setUnblockingUserId(blockedUserId)

      if (!user?.id) {
        console.error('User not authenticated')
        return
      }

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId)

      if (error) {
        console.error('Error unblocking user:', error)
        return
      }

      // Refresh the blocked users list
      await fetchBlockedUsers(user.id)
    } catch (err) {
      console.error('Error unblocking user:', err)
    } finally {
      setUnblockingUserId(null)
    }
  }

  const fetchAllies = async (userId: string) => {
    try {
      const { data: alliesData, error } = await supabase
        .from('allies')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching allies:', error)
        return
      }

      if (alliesData) {
        const allyIds = [...new Set(alliesData.map(a => a.ally_id))]
        
        if (allyIds.length === 0) {
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

        const profilesMap = new Map()
        allyProfiles?.forEach(p => profilesMap.set(p.id, p))

        const enrichedAllies = alliesData.map(ally => ({
          ...ally,
          profile: profilesMap.get(ally.ally_id),
        }))
        
        setAllies(enrichedAllies)
      }
    } catch (err) {
      console.error('Error fetching allies:', err)
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
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (profileData) {
          setProfile(profileData)
          
          // Check username cooldown
          if (profileData.username_change_cooldown_expires_at) {
            const expiresAt = new Date(profileData.username_change_cooldown_expires_at)
            const now = new Date()
            if (expiresAt > now) {
              setUsernameCooldownExpiresAt(profileData.username_change_cooldown_expires_at)
              const millisecondsLeft = expiresAt.getTime() - now.getTime()
              const daysLeft = Math.ceil(millisecondsLeft / (1000 * 60 * 60 * 24))
              setDaysUntilUsernameChange(Math.max(0, daysLeft))
            }
          }
        }
        
        await fetchAllies(userId)

        // Fetch user settings
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (settingsData) {
          setDmPermissions(settingsData.dm_permissions || 'everyone')
          setAllyRequestPermissions(settingsData.ally_request_permissions || 'everyone')
          setTheme(settingsData.theme || 'system')
          setFontSize(settingsData.font_size || 'medium')
          // Apply theme on load
          applyTheme(settingsData.theme || 'system')
          // Apply font size on load
          applyFontSize(settingsData.font_size || 'medium')
        }

        setLoading(false)
      } catch (err) {
        console.error('Unexpected auth error:', err)
        router.push('/login')
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

  // Fetch blocked users when Privacy tab is opened
  useEffect(() => {
    if (activeTab === 'privacy' && user?.id) {
      fetchBlockedUsers(user.id)
    }
  }, [activeTab, user])

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
                      }
                      setActiveSidebarTab(item.id)
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
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Settings</h1>
              <p className="text-gray-400">Manage your account and preferences</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 mb-8 border-b border-gray-800">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`pb-3 font-semibold text-sm transition-all ${
                  activeTab === 'accounts'
                    ? 'text-[#ff4234] border-b-2 border-[#ff4234]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Account
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`pb-3 font-semibold text-sm transition-all ${
                  activeTab === 'privacy'
                    ? 'text-[#ff4234] border-b-2 border-[#ff4234]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Privacy
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`pb-3 font-semibold text-sm transition-all ${
                  activeTab === 'notifications'
                    ? 'text-[#ff4234] border-b-2 border-[#ff4234]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Notifications
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`pb-3 font-semibold text-sm transition-all ${
                  activeTab === 'appearance'
                    ? 'text-[#ff4234] border-b-2 border-[#ff4234]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Appearance
              </button>
            </div>

            {/* Accounts Tab */}
            {activeTab === 'accounts' && (
              <div className="space-y-6">
                <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 bg-[#1f1f1f]">
                    <h2 className="text-white font-semibold text-lg">Account Settings</h2>
                  </div>
                  <div className="divide-y divide-gray-700">
                    {/* Change Username - Top */}
                    <button 
                      onClick={() => {
                        if (daysUntilUsernameChange === 0) {
                          setUsernameError('')
                          setUsernameModalOpen(true)
                        }
                      }}
                      disabled={daysUntilUsernameChange > 0}
                      className={`w-full px-6 py-4 flex items-center justify-between transition-colors group ${
                        daysUntilUsernameChange > 0
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-[#2a2a2a]'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-white font-medium">Change Username</p>
                        <p className="text-gray-500 text-sm">
                          {daysUntilUsernameChange > 0
                            ? `${daysUntilUsernameChange} day${daysUntilUsernameChange !== 1 ? 's' : ''} left until you can change your username again`
                            : `@${profile?.username}`
                          }
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-gray-600 group-hover:text-gray-400" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setEmailError('')
                        setNewEmail('')
                        setEmailModalOpen(true)
                      }}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors group"
                    >
                      <div className="text-left">
                        <p className="text-white font-medium">Change Email</p>
                        <p className="text-gray-500 text-sm">{profile?.email}</p>
                      </div>
                      <ChevronRight size={20} className="text-gray-600 group-hover:text-gray-400" />
                    </button>
                    <button 
                      onClick={() => {
                        setPasswordError('')
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                        setPasswordModalOpen(true)
                      }}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors group"
                    >
                      <div className="text-left">
                        <p className="text-white font-medium">Change Password</p>
                        <p className="text-gray-500 text-sm">Update your security</p>
                      </div>
                      <ChevronRight size={20} className="text-gray-600 group-hover:text-gray-400" />
                    </button>
                  </div>
                </div>
                {/* Logout Button (moved here from Hub) */}
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
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                {/* Success Message */}
                {privacySaveSuccess && (
                  <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-3">
                    <p className="text-green-400 text-sm">Privacy settings saved successfully!</p>
                  </div>
                )}

                {/* Error Message */}
                {privacySaveError && (
                  <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{privacySaveError}</p>
                  </div>
                )}

                {/* Who Can Send Me DMs */}
                <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 bg-[#1f1f1f]">
                    <h2 className="text-white font-semibold text-lg">Who Can Send Me DMs</h2>
                  </div>
                  <div className="divide-y divide-gray-700">
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="dms"
                        value="everyone"
                        checked={dmPermissions === 'everyone'}
                        onChange={(e) => setDmPermissions(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">Everyone</p>
                        <p className="text-gray-500 text-sm">Default setting</p>
                      </div>
                    </label>
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="dms"
                        value="allies_only"
                        checked={dmPermissions === 'allies_only'}
                        onChange={(e) => setDmPermissions(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">My Allies Only</p>
                        <p className="text-gray-500 text-sm">Only users you're allied with</p>
                      </div>
                    </label>
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="dms"
                        value="nobody"
                        checked={dmPermissions === 'nobody'}
                        onChange={(e) => setDmPermissions(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">Nobody</p>
                        <p className="text-gray-500 text-sm">Disable all direct messages</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Who Can Send Me Ally Requests */}
                <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 bg-[#1f1f1f]">
                    <h2 className="text-white font-semibold text-lg">Who Can Send Me Ally Requests</h2>
                  </div>
                  <div className="divide-y divide-gray-700">
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="allyRequests"
                        value="everyone"
                        checked={allyRequestPermissions === 'everyone'}
                        onChange={(e) => setAllyRequestPermissions(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">Everyone</p>
                        <p className="text-gray-500 text-sm">Default setting</p>
                      </div>
                    </label>
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="allyRequests"
                        value="nobody"
                        checked={allyRequestPermissions === 'nobody'}
                        onChange={(e) => setAllyRequestPermissions(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">Nobody</p>
                        <p className="text-gray-500 text-sm">Disable all ally requests</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Blocked Users */}
                <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 bg-[#1f1f1f]">
                    <h2 className="text-white font-semibold text-lg">Blocked Users</h2>
                  </div>
                  {blockedUsersLoading ? (
                    <div className="px-6 py-4 text-gray-400 text-sm">Loading blocked users...</div>
                  ) : blockedUsers && blockedUsers.length > 0 ? (
                    <div className="divide-y divide-gray-700">
                      {blockedUsers.map((blockedUser) => (
                        <div key={blockedUser.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors">
                          <div className="flex items-center gap-3">
                            <AvatarWithFrame
                              src={blockedUser.avatar_url}
                              alt={blockedUser.display_name || blockedUser.username}
                              equippedFrame={blockedUser.equipped_frame}
                              size="sm"
                            />
                            <div>
                              <p className="text-white font-medium">{blockedUser.display_name || blockedUser.username}</p>
                              <p className="text-gray-500 text-sm">@{blockedUser.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnblockUser(blockedUser.id)}
                            disabled={unblockingUserId === blockedUser.id}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-1.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2"
                          >
                            <Ban size={16} />
                            {unblockingUserId === blockedUser.id ? 'Unblocking...' : 'Unblock'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-4 text-gray-400 text-sm">No blocked users</div>
                  )}
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSavePrivacySettings}
                  disabled={privacySaveLoading}
                  className="bg-[#ff4234] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200"
                >
                  {privacySaveLoading ? 'Saving...' : 'Save Privacy Settings'}
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 bg-[#1f1f1f]">
                    <h2 className="text-white font-semibold text-lg">Notification Preferences</h2>
                  </div>
                  <div className="px-6 py-8">
                    <p className="text-gray-400 text-center">Notification settings coming soon...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                {/* Success Message */}
                {appearanceSaveSuccess && (
                  <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-3">
                    <p className="text-green-400 text-sm">Appearance settings saved successfully!</p>
                  </div>
                )}

                {/* Error Message */}
                {appearanceSaveError && (
                  <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{appearanceSaveError}</p>
                  </div>
                )}

                {/* Theme */}
                <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 bg-[#1f1f1f]">
                    <h2 className="text-white font-semibold text-lg">Theme</h2>
                  </div>
                  <div className="divide-y divide-gray-700">
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value="system"
                        checked={theme === 'system'}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">System Default</p>
                        <p className="text-gray-500 text-sm">Follow your system preferences</p>
                      </div>
                    </label>
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value="dark"
                        checked={theme === 'dark'}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">Dark</p>
                        <p className="text-gray-500 text-sm">Always use dark theme</p>
                      </div>
                    </label>
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value="light"
                        checked={theme === 'light'}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">Light</p>
                        <p className="text-gray-500 text-sm">Always use light theme</p>
                      </div>
                    </label>
                  </div>
                  <div className="px-6 py-3 border-t border-gray-700 bg-[#1f1f1f]">
                    <button
                      onClick={handleSaveAppearanceSettings}
                      disabled={appearanceSaveLoading}
                      className="w-full bg-[#ff4234] hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200"
                    >
                      {appearanceSaveLoading ? 'Saving...' : 'Save Appearance Settings'}
                    </button>
                  </div>
                </div>

                {/* Language */}
                <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 bg-[#1f1f1f]">
                    <h2 className="text-white font-semibold text-lg">Language</h2>
                  </div>
                  <div className="divide-y divide-gray-700">
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="language"
                        defaultChecked
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">English</p>
                        <p className="text-gray-500 text-sm">English (US)</p>
                      </div>
                    </label>
                  </div>
                  <div className="px-6 py-4 text-gray-500 text-sm bg-[#1f1f1f]">
                    More languages coming soon...
                  </div>
                </div>

                {/* Font Size */}
                <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 bg-[#1f1f1f]">
                    <h2 className="text-white font-semibold text-lg">Font Size</h2>
                  </div>
                  <div className="divide-y divide-gray-700">
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="fontSize"
                        value="small"
                        checked={fontSize === 'small'}
                        onChange={(e) => setFontSize(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium text-sm">Small</p>
                        <p className="text-gray-500 text-xs">Compact display</p>
                      </div>
                    </label>
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="fontSize"
                        value="medium"
                        checked={fontSize === 'medium'}
                        onChange={(e) => setFontSize(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium">Medium</p>
                        <p className="text-gray-500 text-sm">Default display</p>
                      </div>
                    </label>
                    <label className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="fontSize"
                        value="large"
                        checked={fontSize === 'large'}
                        onChange={(e) => setFontSize(e.target.value)}
                        className="w-4 h-4 accent-[#ff4234]"
                      />
                      <div>
                        <p className="text-white font-medium text-lg">Large</p>
                        <p className="text-gray-500 text-sm">Larger text</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <RightSidebar allies={allies} />

        {/* Change Email Modal */}
        {emailModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl p-6 max-w-sm w-full mx-4 border border-gray-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-white font-bold text-lg mb-2">Change Email</h2>
              <p className="text-gray-400 text-xs mb-4">Enter your new email address. We'll send a confirmation link.</p>

              {emailError && (
                <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{emailError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">New Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={emailLoading}
                    className="w-full bg-[#252525] text-white placeholder-gray-500 px-4 py-2.5 rounded-lg border border-gray-700 focus:border-[#ff4234] focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEmailModalOpen(false)
                    setNewEmail('')
                    setEmailError('')
                  }}
                  disabled={emailLoading}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeEmail}
                  disabled={emailLoading || !newEmail}
                  className="flex-1 px-4 py-2 bg-[#ff4234] hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {emailLoading ? 'Updating...' : 'Update Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {passwordModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl p-6 max-w-sm w-full mx-4 border border-gray-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-white font-bold text-lg mb-2">Change Password</h2>
              <p className="text-gray-400 text-xs mb-4">
                Password requirements: At least 8 characters, 1 uppercase letter, and 1 number
              </p>
              
              {passwordError && (
                <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{passwordError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={passwordLoading}
                    className="w-full bg-[#252525] text-white placeholder-gray-500 px-4 py-2.5 rounded-lg border border-gray-700 focus:border-[#ff4234] focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={passwordLoading}
                    className="w-full bg-[#252525] text-white placeholder-gray-500 px-4 py-2.5 rounded-lg border border-gray-700 focus:border-[#ff4234] focus:outline-none transition-colors disabled:opacity-50"
                  />
                  {newPassword && (
                    <div className="mt-2 space-y-1 text-xs">
                      <div className={newPassword.length >= 8 ? 'text-green-400' : 'text-gray-500'}>
                        ✓ At least 8 characters {newPassword.length}/8
                      </div>
                      <div className={/[A-Z]/.test(newPassword) ? 'text-green-400' : 'text-gray-500'}>
                        ✓ At least one uppercase letter
                      </div>
                      <div className={/[0-9]/.test(newPassword) ? 'text-green-400' : 'text-gray-500'}>
                        ✓ At least one number
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={passwordLoading}
                    className="w-full bg-[#252525] text-white placeholder-gray-500 px-4 py-2.5 rounded-lg border border-gray-700 focus:border-[#ff4234] focus:outline-none transition-colors disabled:opacity-50"
                  />
                  {confirmPassword && newPassword && (
                    <div className="mt-2 text-xs">
                      {newPassword === confirmPassword ? (
                        <div className="text-green-400">✓ Passwords match</div>
                      ) : (
                        <div className="text-red-400">✗ Passwords do not match</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setPasswordModalOpen(false)
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordError('')
                  }}
                  disabled={passwordLoading}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="flex-1 px-4 py-2 bg-[#ff4234] hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Change Success Modal */}
        {passwordSuccessOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1f1f1f] rounded-xl p-6 max-w-sm w-full mx-4 border border-gray-800">
              <div className="flex justify-center mb-4">
                <div className="bg-green-900/20 rounded-full p-3">
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h2 className="text-white font-bold text-lg text-center mb-2">Password Updated</h2>
              <p className="text-gray-400 text-sm text-center mb-6">
                Your password has been changed successfully. Please remember to keep your new password secure.
              </p>
              <button
                onClick={() => setPasswordSuccessOpen(false)}
                className="w-full px-4 py-2.5 bg-[#ff4234] hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Change Username Modal */}
        <ChangeUsernameModal
          isOpen={usernameModalOpen}
          currentUsername={profile?.username || ''}
          onClose={() => setUsernameModalOpen(false)}
          onConfirm={handleChangeUsername}
          isLoading={usernameLoading}
          error={usernameError}
          isCooldown={daysUntilUsernameChange > 0}
          daysRemaining={daysUntilUsernameChange}
        />
      </div>
    </div>
  )
}
