import { createHmac, timingSafeEqual } from 'crypto'

function base64urlToBase64(s: string) {
  let out = s.replace(/-/g, '+').replace(/_/g, '/')
  while (out.length % 4 !== 0) out += '='
  return out
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = body?.token
    if (!token) return new Response(JSON.stringify({ success: false, error: 'missing_token' }), { status: 400 })

    const parts = token.split('.')
    if (parts.length !== 3) return new Response(JSON.stringify({ success: false, error: 'invalid_token' }), { status: 400 })

    const [headerB64, payloadB64, sig] = parts
    const signingInput = `${headerB64}.${payloadB64}`

    const secret = process.env.ADMIN_SHARED_SECRET || ''
    if (!secret) {
      console.error('[verify-admin-token] missing ADMIN_SHARED_SECRET')
      return new Response(JSON.stringify({ success: false, error: 'server_misconfigured' }), { status: 500 })
    }

    const expected = createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

    try {
      const ok = timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
      if (!ok) return new Response(JSON.stringify({ success: false, error: 'invalid_signature' }), { status: 403 })
    } catch (e) {
      // timingSafeEqual can throw if lengths differ
      if (expected !== sig) return new Response(JSON.stringify({ success: false, error: 'invalid_signature' }), { status: 403 })
    }

    // Decode payload
    const payloadJson = Buffer.from(base64urlToBase64(payloadB64), 'base64').toString('utf8')
    const payload = JSON.parse(payloadJson)

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return new Response(JSON.stringify({ success: false, error: 'expired' }), { status: 403 })

    return new Response(JSON.stringify({ success: true, admin_id: payload.sub }), { status: 200 })
  } catch (err) {
    console.error('[verify-admin-token] Exception:', err)
    return new Response(JSON.stringify({ success: false, error: 'exception' }), { status: 500 })
  }
}
