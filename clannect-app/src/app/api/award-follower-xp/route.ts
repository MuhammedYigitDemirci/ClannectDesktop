import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Award XP to user for gaining a new follower
export async function POST(request: NextRequest) {
  try {
    const { followedUserId, followerUserId } = await request.json()

    console.log(`Award XP request: followedUserId=${followedUserId}, followerUserId=${followerUserId}`)

    if (!followedUserId || !followerUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the authorization token from the cookie
    const cookieStore = request.cookies
    const authCookie = cookieStore.get('sb-eetmktemjrwbxjsvuumj-auth-token')?.value

    if (!authCookie) {
      console.error('No auth cookie found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // The cookie value is base64-encoded JSON containing the access_token
    let accessToken: string
    try {
      // Remove 'base64-' prefix if it exists
      const cookieValue = authCookie.startsWith('base64-') ? authCookie.slice(7) : authCookie
      
      // Base64 decode the cookie
      const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8')
      const cookieData = JSON.parse(decoded)
      
      accessToken = cookieData.access_token
      if (!accessToken) {
        console.error('No access_token in cookie data')
        return NextResponse.json(
          { error: 'Invalid auth token' },
          { status: 401 }
        )
      }
    } catch (e) {
      console.error('Failed to parse auth token:', e)
      return NextResponse.json(
        { error: 'Invalid auth token' },
        { status: 401 }
      )
    }

    // Create Supabase client with auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        },
      }
    )

    // Get the followed user's current profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', followedUserId)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 400 }
      )
    }

    if (!profileData) {
      console.error('Profile not found for user:', followedUserId)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate new XP and level
    const newXp = profileData.xp + 5
    
    // Calculate level (same logic as frontend)
    let level = 1
    let xpUsed = 0
    const levelRequirements = [
      { minLevel: 1, maxLevel: 10, xpPerLevel: 50 },
      { minLevel: 10, maxLevel: 30, xpPerLevel: 125 },
      { minLevel: 30, maxLevel: 50, xpPerLevel: 300 },
      { minLevel: 50, maxLevel: 80, xpPerLevel: 700 },
      { minLevel: 80, maxLevel: 90, xpPerLevel: 1500 },
      { minLevel: 90, maxLevel: 101, xpPerLevel: 2000 },
    ]

    while (level < 100) {
      const config = levelRequirements.find(c => level >= c.minLevel && level < c.maxLevel)
      if (!config) break
      const xpNeeded = config.xpPerLevel
      if (xpUsed + xpNeeded > newXp) break
      xpUsed += xpNeeded
      level++
    }

    console.log(`Updating profile: newXp=${newXp}, newLevel=${level}`)

    // Update profile with new XP and level
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ xp: newXp, level })
      .eq('id', followedUserId)

    if (updateError) {
      console.error('Error updating XP:', updateError)
      return NextResponse.json(
        { error: 'Failed to update XP', details: updateError.message },
        { status: 400 }
      )
    }

    // Mark follower as having awarded XP
    const { error: flagError } = await supabase
      .from('followers')
      .update({ xp_awarded: true })
      .eq('user_id', followedUserId)
      .eq('follower_user_id', followerUserId)

    if (flagError) {
      console.error('Error marking XP as awarded:', flagError)
      // Don't fail the request, just log it
    }

    return NextResponse.json({
      success: true,
      newXp,
      newLevel: level,
      message: `Awarded 5 XP to user ${followedUserId}`,
    })
  } catch (error) {
    console.error('Error in award-follower-xp:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
