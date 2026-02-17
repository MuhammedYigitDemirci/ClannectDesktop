import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
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
    let userId: string
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
      const tokenData = JSON.parse(jwtPayload)
      userId = tokenData?.sub
      
      if (!userId) {
        console.error('No user ID in token')
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

    // Get count of pending ally requests for this user
    const { count, error } = await supabase
      .from('ally_requests')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('status', 'pending')

    if (error) {
      console.error('Error fetching ally request count:', error)
      return NextResponse.json(
        { error: 'Failed to fetch count', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      count: count || 0,
      maxDisplay: 9
    })
  } catch (error) {
    console.error('Error in get-ally-request-count:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
