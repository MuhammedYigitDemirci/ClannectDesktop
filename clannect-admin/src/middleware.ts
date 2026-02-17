import { NextRequest, NextResponse } from 'next/server'

// Middleware enforces that every non-static request must present a
// valid admin token. If no valid token is present, return an empty
// 404 response (so the browser shows "site not found").
//
// Behavior:
// - Allow static/_next/api/favicons through.
// - If the URL contains a `t` query param, let the request through
//   so the `admin-verify` route can validate and set a cookie.
// - Otherwise, require a valid `admin_token` cookie; verify its HMAC
//   and expiry using Web Crypto. Invalid or missing tokens return 404.
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Bypass only static asset requests and internal Next paths.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_static') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // If a token is present in the query string, allow the request
  // to proceed so the verification route can set a cookie.
  if (searchParams.has('t')) return NextResponse.next()

  // Check for cookie token
  const cookieToken = request.cookies.get('admin_token')?.value
  if (!cookieToken) return new Response(null, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': '0' } })

  // Verify token in Edge runtime using Web Crypto
  try {
    const parts = cookieToken.split('.')
    if (parts.length !== 3) return new Response(null, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': '0' } })

    const [headerB64, payloadB64, sigB64] = parts
    const signingInput = `${headerB64}.${payloadB64}`

    const secret = process.env.ADMIN_SHARED_SECRET || ''
    if (!secret) return new Response(null, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': '0' } })

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signingInput))

    // convert ArrayBuffer to base64url (no padding)
    const sigArr = new Uint8Array(sig)
    let b64 = typeof Buffer === 'undefined' ? btoa(String.fromCharCode(...sigArr)) : Buffer.from(sigArr).toString('base64')
    // base64 -> base64url
    const b64url = b64.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')

    if (b64url !== sigB64) return new Response(null, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': '0' } })

    // check expiry in payload
    const payloadJson = typeof Buffer === 'undefined'
      ? decodeURIComponent(escape(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))))
      : Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const payload = JSON.parse(payloadJson)
    const now = Math.floor(Date.now() / 1000)
    if (!payload?.exp || payload.exp < now) return new Response(null, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': '0' } })

    // token valid
    return NextResponse.next()
  } catch (e) {
    return new Response(null, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': '0' } })
  }
}

export const config = {
  // Run middleware for all app routes including `/api` so we can
  // return a raw empty 404 for unauthorized requests.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
