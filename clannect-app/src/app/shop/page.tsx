'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Home, Plus, ShoppingCart, Users, User, Settings, LogOut, Zap, Bookmark } from 'lucide-react'
import RightSidebar from '../components/RightSidebar'
import AvatarWithFrame from '../components/AvatarWithFrame'

export default function ShopPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSidebarTab, setActiveSidebarTab] = useState('shop')
  const [allies, setAllies] = useState<any[]>([])
  const [rightSidebarLoading, setRightSidebarLoading] = useState(true)
  const [allyRequestCount, setAllyRequestCount] = useState(0)
  const [activeShopTab, setActiveShopTab] = useState<'frames' | 'themes' | 'boosts'>('frames')
  const [ownedFrames, setOwnedFrames] = useState<Set<number>>(new Set())
  const [equippedFrame, setEquippedFrame] = useState<number | null>(null)
  const [purchasingFrameId, setPurchasingFrameId] = useState<number | null>(null)
  const [ownedThemes, setOwnedThemes] = useState<Set<number>>(new Set())
  const [equippedTheme, setEquippedTheme] = useState<number | null>(null)
  const [purchasingThemeId, setPurchasingThemeId] = useState<number | null>(null)
  const [levelModalOpen, setLevelModalOpen] = useState(false)
  const [levelModalMessage, setLevelModalMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // XP system configuration (copied from profile page to calculate level from xp)
  const XP_CONFIG = {
    levelRequirements: [
      { minLevel: 1, maxLevel: 10, xpPerLevel: 50 },
      { minLevel: 10, maxLevel: 30, xpPerLevel: 125 },
      { minLevel: 30, maxLevel: 50, xpPerLevel: 300 },
      { minLevel: 50, maxLevel: 80, xpPerLevel: 700 },
      { minLevel: 80, maxLevel: 90, xpPerLevel: 1500 },
      { minLevel: 90, maxLevel: 101, xpPerLevel: 2000 },
    ]
  }

  const calculateXpForLevel = (level: number): number => {
    if (level >= 100) return 0
    const config = XP_CONFIG.levelRequirements.find(c => level >= c.minLevel && level < c.maxLevel)
    return config ? config.xpPerLevel : 0
  }

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
          // Set equipped items from profile (database)
          if (profileData.equipped_frame) {
            setEquippedFrame(profileData.equipped_frame)
          }
          if (profileData.equipped_theme) {
            setEquippedTheme(profileData.equipped_theme)
          }
        }

        // Load owned themes from database
        const loadOwnedThemes = async (userId: string) => {
          try {
            const { data: ownedData, error: ownedError } = await supabase
              .from('user_owned_items')
              .select('item_id')
              .eq('user_id', userId)
              .eq('item_type', 'themes')

            if (ownedData && ownedData.length > 0) {
              setOwnedThemes(new Set(ownedData.map(item => item.item_id)))
            } else {
              setOwnedThemes(new Set())
            }
          } catch (err) {
            console.error('Error loading owned themes:', err)
            setOwnedThemes(new Set())
          }
        }

        // Load owned frames and themes from database
        await loadOwnedFrames(session.user.id)
        await loadOwnedThemes(session.user.id)
        
        setLoading(false)
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/login')
      }
    }

    checkAuth()
  }, [supabase, router])

  // Load owned frames from database
  const loadOwnedFrames = async (userId: string) => {
    try {
      // Load from database first
      const { data: ownedData, error: ownedError } = await supabase
        .from('user_owned_items')
        .select('item_id')
        .eq('user_id', userId)
        .eq('item_type', 'frames')
      
      if (ownedData && ownedData.length > 0) {
        setOwnedFrames(new Set(ownedData.map(item => item.item_id)))
      } else {
        setOwnedFrames(new Set())
      }
    } catch (err) {
      console.error('Error loading owned frames:', err)
    }
  }

  // Handle frame purchase
  const handlePurchaseFrame = async (frameId: number, price: number, levelRequired: number) => {
    if (!user || !profile) return

    // Check level requirement (use xp->level if level not present)
    // Re-fetch latest profile from DB to enforce level/cloin server-side
    try {
      const { data: latestProfile, error: latestError } = await supabase
        .from('profiles')
        .select('level, xp, cloin')
        .eq('id', user.id)
        .single()

      if (latestError) {
        console.error('Error fetching latest profile before purchase:', latestError)
        alert('Unable to verify requirements. Please try again.')
        return
      }

      const latestLevel = (latestProfile.level && latestProfile.level > 0) ? latestProfile.level : getLevelFromXp(latestProfile.xp || 0).level
      if (latestLevel < levelRequired) {
        setLevelModalMessage("You don't meet the level requirements for this item.")
        setLevelModalOpen(true)
        return
      }

      if ((latestProfile.cloin || 0) < price) {
        alert(`Insufficient balance. You need ${price} cloin but only have ${latestProfile.cloin || 0}`)
        return
      }
    } catch (err) {
      console.error('Exception while verifying profile before purchase:', err)
      alert('Unable to verify requirements. Please try again.')
      return
    }

    try {
      setPurchasingFrameId(frameId)

      // Deduct cloin from profile and set equipped frame in one update
      const newCloin = (profile.cloin || 0) - price
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cloin: newCloin, equipped_frame: frameId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        alert('Failed to complete purchase. Please try again.')
        return
      }

      // Save to user_owned_items table
      const { error: ownedError } = await supabase
        .from('user_owned_items')
        .upsert({
          user_id: user.id,
          item_id: frameId,
          item_type: 'frames'
        }, { onConflict: 'user_id,item_id,item_type' })

      if (ownedError) {
        console.error('Error saving owned item:', ownedError)
        // Non-critical, continue anyway
      }

      // Update local profile state
      setProfile({ ...profile, cloin: newCloin, equipped_frame: frameId })

      // Update local owned frames state and equipped frame state
      const newOwnedFrames = new Set(ownedFrames)
      newOwnedFrames.add(frameId)
      setOwnedFrames(newOwnedFrames)
      setEquippedFrame(frameId)

      console.log(`✅ Frame ${frameId} purchased and equipped!`)
    } catch (err) {
      console.error('Error purchasing frame:', err)
      alert('An error occurred during purchase. Please try again.')
    } finally {
      setPurchasingFrameId(null)
    }
  }

  // Handle frame equip/unequip
  const handleToggleEquipFrame = async (frameId: number) => {
    if (!user) return

    try {
      const newEquippedFrame = equippedFrame === frameId ? null : frameId

      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ equipped_frame: newEquippedFrame })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating equipped frame:', error)
        return
      }

      // Update local state
      setEquippedFrame(newEquippedFrame)
      setProfile({ ...profile, equipped_frame: newEquippedFrame })
      console.log(`Frame ${frameId} ${newEquippedFrame ? 'equipped' : 'unequipped'}`)
    } catch (err) {
      console.error('Error toggling frame equip:', err)
    }
  }

  // Handle theme purchase
  const handlePurchaseTheme = async (themeId: number, price: number, levelRequired: number) => {
    if (!user || !profile) return

    // Check level requirement (use xp->level if level not present)
    // Re-fetch latest profile from DB to enforce level/cloin server-side
    try {
      const { data: latestProfile, error: latestError } = await supabase
        .from('profiles')
        .select('level, xp, cloin')
        .eq('id', user.id)
        .single()

      if (latestError) {
        console.error('Error fetching latest profile before theme purchase:', latestError)
        alert('Unable to verify requirements. Please try again.')
        return
      }

      const latestLevel = (latestProfile.level && latestProfile.level > 0) ? latestProfile.level : getLevelFromXp(latestProfile.xp || 0).level
      if (latestLevel < levelRequired) {
        setLevelModalMessage("You don't meet the level requirements for this item.")
        setLevelModalOpen(true)
        return
      }

      if ((latestProfile.cloin || 0) < price) {
        alert(`Insufficient balance. You need ${price} cloin but only have ${latestProfile.cloin || 0}`)
        return
      }
    } catch (err) {
      console.error('Exception while verifying profile before theme purchase:', err)
      alert('Unable to verify requirements. Please try again.')
      return
    }

    try {
      setPurchasingThemeId(themeId)

      const newCloin = (profile.cloin || 0) - price
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cloin: newCloin, equipped_theme: themeId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile for theme purchase:', updateError)
        alert('Failed to complete purchase. Please try again.')
        return
      }

      const { error: ownedError } = await supabase
        .from('user_owned_items')
        .upsert({ user_id: user.id, item_id: themeId, item_type: 'themes' }, { onConflict: 'user_id,item_id,item_type' })

      if (ownedError) console.error('Error saving owned theme:', ownedError)

      setProfile({ ...profile, cloin: newCloin, equipped_theme: themeId })

      const newOwned = new Set(ownedThemes)
      newOwned.add(themeId)
      setOwnedThemes(newOwned)
      setEquippedTheme(themeId)
      console.log(`✅ Theme ${themeId} purchased and equipped!`)
    } catch (err) {
      console.error('Error purchasing theme:', err)
      alert('An error occurred during purchase. Please try again.')
    } finally {
      setPurchasingThemeId(null)
    }
  }

  // Handle theme equip/unequip
  const handleToggleEquipTheme = async (themeId: number) => {
    if (!user) return

    try {
      const newEquipped = equippedTheme === themeId ? null : themeId

      const { error } = await supabase
        .from('profiles')
        .update({ equipped_theme: newEquipped })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating equipped theme:', error)
        return
      }

      setEquippedTheme(newEquipped)
      setProfile({ ...profile, equipped_theme: newEquipped })
      console.log(`Theme ${themeId} ${newEquipped ? 'equipped' : 'unequipped'}`)
    } catch (err) {
      console.error('Error toggling theme equip:', err)
    }
  }

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
      try {
        if (!user) return

        const { data: alliesData, error } = await supabase
          .from('allies')
          .select('ally_user_id')
          .eq('user_id', user.id)

        if (error) throw error

        const allyIds = alliesData?.map(a => a.ally_user_id) || []
        if (allyIds.length === 0) {
          setAllies([])
          setRightSidebarLoading(false)
          return
        }

        const { data: allyProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', allyIds)

        if (profileError) throw profileError

        setAllies(allyProfiles || [])
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

  // Shop items data
  const avatarFrames = [
    { id: 1, name: 'White Frame', price: 10, levelRequired: 1, icon: '⚪', image: '/Visuals/WhiteAvatarFrame.png' },
    { id: 2, name: 'Neon Frame', price: 30, levelRequired: 2, icon: '✨', image: '/Visuals/NeonAvatarFrame.png' },
    { id: 3, name: 'Crimson Frame', price: 60, levelRequired: 4, icon: '🔴', image: '/Visuals/CrimsonAvatarFrame.png' },
  ]

  const profileThemes = [
    { id: 1, name: 'Ocean Blue', price: 20, levelRequired: 1, image: '/OceanBlueTheme.png' },
    { id: 2, name: 'Sunset Glow', price: 45, levelRequired: 3, image: '/SunsetGlowTheme.png' },
    { id: 3, name: 'Galaxy Dreams', price: 80, levelRequired: 5, image: '/GalaxyDreamsTheme.png' },
  ]

  const boosts = [
    { id: 1, name: 'Spotlight', price: 50, duration: '2 hours', icon: '💡' },
    { id: 2, name: 'Golden Touch', price: 75, duration: '1 hour', icon: '✨' },
    { id: 3, name: 'Power Surge', price: 100, duration: '1 hour', icon: '⚡' },
  ]

  const renderShopItems = () => {
    let items: any[] = []
    let showLevelRequired = true

    if (activeShopTab === 'frames') {
      items = avatarFrames
    } else if (activeShopTab === 'themes') {
      items = profileThemes
    } else {
      items = boosts
      showLevelRequired = false
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-gradient-to-br from-[#252525] to-[#1f1f1f] rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-[#ff4234]/20"
          >
            {/* Item Icon/Visual / Theme Banner */}
            {activeShopTab === 'frames' ? (
              <div className="h-32 bg-gradient-to-br from-[#ff4234]/20 to-[#ff4234]/5 flex items-center justify-center text-6xl relative">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="h-32 w-full object-contain"
                  />
                ) : (
                  <div className="text-6xl">{item.icon}</div>
                )}
              </div>
            ) : activeShopTab === 'themes' ? (
              <div className="h-40 w-full relative overflow-hidden">
                {item.image ? (
                  <div
                    className="absolute inset-0 bg-center bg-cover"
                    style={{ backgroundImage: `url('${item.image}')` }}
                  />
                ) : (
                  <div className="h-40 bg-gradient-to-br from-[#ff4234]/20 to-[#ff4234]/5 flex items-center justify-center text-6xl">{item.icon}</div>
                )}
                <div className="absolute inset-0 bg-black/20" />
              </div>
            ) : (
              <div className="h-32 bg-gradient-to-br from-[#ff4234]/20 to-[#ff4234]/5 flex items-center justify-center text-6xl relative">{item.icon}</div>
            )}

            {/* Item Info */}
            <div className="p-6">
              <h3 className="text-white font-semibold text-lg mb-2">{item.name}</h3>

              {/* Level Required or Duration */}
              {showLevelRequired ? (
                <p className="text-gray-400 text-sm mb-4">
                  Level Required: <span className="text-[#ff4234] font-semibold">{item.levelRequired}</span>
                </p>
              ) : (
                <p className="text-gray-400 text-sm mb-4">
                  Duration: <span className="text-[#ff4234] font-semibold">{item.duration}</span>
                </p>
              )}

              {/* Price and Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <img src="/Visuals/ClannectCoin.png" alt="Cloin" className="w-5 h-5" />
                  <span className="text-yellow-400 font-bold text-lg">{item.price}</span>
                </div>
                {activeShopTab === 'frames' ? (
                  <>
                      {!ownedFrames.has(item.id) ? (
                      // Buy button for frames (client-side level check before purchase)
                      <button
                        onClick={() => {
                          const currentLevel = (profile?.level && profile.level > 0) ? profile.level : getLevelFromXp(profile?.xp || 0).level
                          if (currentLevel < item.levelRequired) {
                            setLevelModalMessage("You don't meet the level requirements for this item.")
                            setLevelModalOpen(true)
                            return
                          }
                          handlePurchaseFrame(item.id, item.price, item.levelRequired)
                        }}
                        disabled={purchasingFrameId === item.id}
                        className="bg-[#ff4234] hover:bg-red-600 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      >
                        {purchasingFrameId === item.id ? 'Buying...' : 'Buy'}
                      </button>
                    ) : (
                      // Equip/Unequip button for frames
                      <button
                        onClick={() => handleToggleEquipFrame(item.id)}
                        className={`font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm ${
                          equippedFrame === item.id
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {equippedFrame === item.id ? 'Unequip' : 'Equip'}
                      </button>
                    )}
                  </>
                ) : activeShopTab === 'themes' ? (
                  <>
                    {!ownedThemes.has(item.id) ? (
                      // Buy button for themes (client-side level check before purchase)
                      <button
                        onClick={() => {
                          const currentLevel = (profile?.level && profile.level > 0) ? profile.level : getLevelFromXp(profile?.xp || 0).level
                          if (currentLevel < item.levelRequired) {
                            setLevelModalMessage("You don't meet the level requirements for this item.")
                            setLevelModalOpen(true)
                            return
                          }
                          handlePurchaseTheme(item.id, item.price, item.levelRequired)
                        }}
                        disabled={purchasingThemeId === item.id}
                        className="bg-[#ff4234] hover:bg-red-600 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      >
                        {purchasingThemeId === item.id ? 'Buying...' : 'Buy'}
                      </button>
                    ) : (
                      // Equip/Unequip button for themes
                      <button
                        onClick={() => handleToggleEquipTheme(item.id)}
                        className={`font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm ${
                          equippedTheme === item.id
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {equippedTheme === item.id ? 'Unequip' : 'Equip'}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    className="bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
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

  return (
    <div className="min-h-screen bg-[#181818] text-white">
      {levelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setLevelModalOpen(false)} />
          <div className="bg-[#0f1720] rounded-lg p-6 z-10 w-full max-w-md text-center shadow-lg">
            <h3 className="text-lg font-bold text-white mb-2">Level Requirement</h3>
            <p className="text-gray-300 mb-4">{levelModalMessage || "You don't meet the level requirements for this item."}</p>
            <button onClick={() => setLevelModalOpen(false)} className="bg-[#ff4234] hover:bg-red-600 text-white py-2 px-5 rounded-lg">OK</button>
          </div>
        </div>
      )}
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
          <div className="max-w-6xl mx-auto p-8">
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ff4234]/20">
                  <ShoppingCart size={32} className="text-[#ff4234]" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">Shop</h1>
                  <p className="text-gray-400">Customize your profile and boost your presence</p>
                </div>
              </div>

              {/* User Currency Display */}
              {profile && (
                <div className="flex items-center gap-2 mt-6">
                  <img src="/Visuals/ClannectCoin.png" alt="Cloin" className="w-6 h-6" />
                  <span className="text-white font-semibold">Balance: </span>
                  <span className="text-yellow-400 font-bold text-xl">{profile.cloin || 0}</span>
                </div>
              )}
            </div>

            {/* Warning Banner */}
            <div className="mb-8 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
              <p className="text-yellow-300 text-sm">
                <span className="font-semibold">⚠️ We are still working on this page,</span> thank you for your patience. More items will be added and bugs will be fixed soon!
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-gray-700 pb-4">
              <button
                onClick={() => setActiveShopTab('frames')}
                className={`pb-2 px-4 font-semibold text-sm transition-all ${
                  activeShopTab === 'frames'
                    ? 'text-[#ff4234] border-b-2 border-[#ff4234]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Avatar Frames
              </button>
              <button
                onClick={() => setActiveShopTab('themes')}
                className={`pb-2 px-4 font-semibold text-sm transition-all ${
                  activeShopTab === 'themes'
                    ? 'text-[#ff4234] border-b-2 border-[#ff4234]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Profile Themes
              </button>
              <button
                disabled
                className="pb-2 px-4 font-semibold text-sm transition-all text-gray-600 cursor-not-allowed opacity-50 flex items-center gap-2"
                title="Coming soon"
              >
                <Zap size={16} />
                Boosts
                <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">COMING SOON</span>
              </button>
            </div>

            {/* Shop Items */}
            {renderShopItems()}
          </div>
        </div>

        {/* Right Sidebar - Allies */}
        <RightSidebar allies={allies} />
      </div>
    </div>
  )
}