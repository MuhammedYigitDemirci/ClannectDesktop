import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import crypto from 'crypto'

function base64urlToBuffer(str: string) {
  // convert from base64url to base64
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  // pad
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64')
}

function bufferToBase64url(buf: Buffer) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function verifyHmacSha256(message: string, signatureB64url: string, secret: string) {
  const h = crypto.createHmac('sha256', secret).update(message).digest()
  const expected = bufferToBase64url(h)
  // timing-safe compare
  const sigBuf = base64urlToBuffer(signatureB64url)
  const expBuf = Buffer.from(h)
  if (sigBuf.length !== expBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, expBuf)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = (body && body.token) || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const parts = token.split('.')
    if (parts.length !== 3) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

    const [hdrB64, payloadB64, sigB64] = parts
    const payloadBuf = base64urlToBuffer(payloadB64)
    const payloadJson = JSON.parse(payloadBuf.toString('utf8'))

    const secret = process.env.ADMIN_TOKEN_SECRET
    if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

    const signed = `${hdrB64}.${payloadB64}`
    const valid = verifyHmacSha256(signed, sigB64, secret)
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

    // Check exp if present
    const now = Math.floor(Date.now() / 1000)
    if (payloadJson.exp && Number(payloadJson.exp) < now) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    // Extract user id (sub) from payload
    const userId = payloadJson.sub || payloadJson.user_id || null
    if (!userId) return NextResponse.json({ error: 'Token missing subject' }, { status: 400 })

    // Use server client (service role) to check admin table
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('clannect_admins')
      .select('id, role')
      .eq('user_uuid', userId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    return NextResponse.json({ admin: true, role: data.role }, { status: 200 })
  } catch (err) {
    console.error('verify-token error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
