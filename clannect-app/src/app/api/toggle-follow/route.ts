import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// API endpoint to handle follow/unfollow operations for users
// Extracts user session from Supabase auth cookie and manages follow relationships
export async function POST(request: NextRequest) {
  try {
    const { userId, followerUserId, action } = await request.json()

    console.log(`Toggle follow request: userId=${userId}, followerUserId=${followerUserId}, action=${action}`)

    if (!userId || !followerUserId || !action) {
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
    let tokenData: any
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

      // Parse the JWT token to get the user ID
      const jwtParts = accessToken.split('.')
      if (jwtParts.length !== 3) {
        console.error('Invalid JWT format')
        return NextResponse.json(
          { error: 'Invalid auth token' },
          { status: 401 }
        )
      }

      const jwtPayload = Buffer.from(jwtParts[1], 'base64').toString('utf-8')
      tokenData = JSON.parse(jwtPayload)
    } catch (e) {
      console.error('Failed to parse auth token:', e)
      return NextResponse.json(
        { error: 'Invalid auth token' },
        { status: 401 }
      )
    }

    const authenticatedUserId = tokenData?.sub
    if (!authenticatedUserId) {
      console.error('No user ID (sub) in token')
      return NextResponse.json(
        { error: 'Invalid auth token' },
        { status: 401 }
      )
    }

    // Verify the followerUserId matches the authenticated user
    if (followerUserId !== authenticatedUserId) {
      console.error(`User mismatch: ${followerUserId} !== ${authenticatedUserId}`)
      return NextResponse.json(
        { error: 'Cannot follow as another user' },
        { status: 403 }
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

    if (action === 'follow') {
      // Check if previous follow record exists with xp_awarded = true
      const { data: existingFollow, error: followError } = await supabase
        .from('followers')
        .select('xp_awarded, unfollowed_at')
        .eq('user_id', userId)
        .eq('follower_user_id', followerUserId)
        .maybeSingle()

      if (followError) {
        console.error('Error checking existing follow:', followError)
      }

      const shouldAwardXp = !existingFollow || !existingFollow.xp_awarded

      if (existingFollow && existingFollow.unfollowed_at) {
        // Reactivate the follow (was unfollowed before)
        const { error: updateError } = await supabase
          .from('followers')
          .update({ unfollowed_at: null })
          .eq('user_id', userId)
          .eq('follower_user_id', followerUserId)

        if (updateError) {
          console.error('Error reactivating follow:', updateError)
          return NextResponse.json(
            { error: 'Failed to follow user', details: updateError.message },
            { status: 400 }
          )
        }
      } else if (!existingFollow) {
        // Create new follow
        console.log(`Creating new follow: user_id=${userId}, follower_user_id=${followerUserId}`)
        const { error: insertError } = await supabase
          .from('followers')
          .insert([{ user_id: userId, follower_user_id: followerUserId, xp_awarded: false }])

        if (insertError) {
          console.error('Error creating follow:', insertError)
          return NextResponse.json(
            { error: 'Failed to follow user', details: insertError.message },
            { status: 400 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        shouldAwardXp,
        message: `Successfully followed user ${userId}`,
      })
    } else if (action === 'unfollow') {
      // Set unfollowed_at instead of deleting
      console.log(`Unfollowing: user_id=${userId}, follower_user_id=${followerUserId}`)
      
      // First check if the record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('followers')
        .select('*')
        .eq('user_id', userId)
        .eq('follower_user_id', followerUserId)
        .maybeSingle()

      console.log('Existing record check:', { exists: !!existingRecord, record: existingRecord, error: checkError })

      if (!existingRecord) {
        return NextResponse.json({
          success: false,
          message: 'Follow record not found',
          updatedCount: 0,
        }, { status: 404 })
      }

      const { data, error, status, statusText } = await supabase
        .from('followers')
        .update({ unfollowed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('follower_user_id', followerUserId)
        .select()

      if (error) {
        console.error('Error unfollowing user:', error)
        console.error('Status:', status, statusText)
        return NextResponse.json(
          { error: 'Failed to unfollow user', details: error.message },
          { status: 400 }
        )
      }

      console.log('Unfollow successful. Updated rows:', data?.length || 0)

      return NextResponse.json({
        success: true,
        message: `Successfully unfollowed user ${userId}`,
        updatedCount: data?.length || 0,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in toggle-follow:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
