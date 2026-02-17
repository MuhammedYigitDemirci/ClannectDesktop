import { createHmac, timingSafeEqual } from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function base64urlToBase64(s: string) {
  let out = s.replace(/-/g, '+').replace(/_/g, '/')
  while (out.length % 4 !== 0) out += '='
  return out
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('t')
    if (!token) return new Response('', { status: 404 })

    const parts = token.split('.')
    if (parts.length !== 3) return new Response('', { status: 404 })

    const [headerB64, payloadB64, sig] = parts
    const signingInput = `${headerB64}.${payloadB64}`

    const secret = process.env.ADMIN_SHARED_SECRET || ''
    if (!secret) return new Response('', { status: 404 })

    const expected = createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

    try {
      const ok = timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
      if (!ok) return new Response('', { status: 404 })
    } catch (e) {
      if (expected !== sig) return new Response('', { status: 404 })
    }

    // decode payload and check expiry
    let payload: any
    try {
      const payloadJson = Buffer.from(base64urlToBase64(payloadB64), 'base64').toString('utf8')
      payload = JSON.parse(payloadJson)
    } catch (e) {
      return new Response('', { status: 404 })
    }

    const now = Math.floor(Date.now() / 1000)
    if (!payload?.exp || payload.exp < now) return new Response('', { status: 404 })

    const adminId = payload.sub
    if (!adminId) return new Response('', { status: 404 })

    // Fetch profile using service role client
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, equipped_frame')
      .eq('id', adminId)
      .maybeSingle()

    if (error || !profile) return new Response('', { status: 404 })

    // Return minimal HTML showing id and username; include small script to remove token from URL
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Admin Verified</title>
    <style>body{background:#0f1724;color:#fff;font-family:Inter,system-ui,Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0} .card{background:#111827;padding:28px;border-radius:10px;max-width:560px;text-align:center}</style>
  </head>
  <body>
    <div class="card">
      <h1 style="color:#ff4234;margin:0 0 8px">Admin Verified</h1>
      <p style="margin:8px 0 0">Admin ID: <code style="background:#0b1220;padding:4px 8px;border-radius:6px;color:#9ca3af">${escapeHtml(profile.id)}</code></p>
      <p style="margin:8px 0 0">Username: <code style="background:#0b1220;padding:4px 8px;border-radius:6px;color:#9ca3af">${escapeHtml(profile.username || profile.display_name || '')}</code></p>
    </div>
    <script>
      try {
        // After server sets the cookie, navigate to the admin center overview.
        window.location.replace('/center/overview');
      } catch (e) {}
    </script>
  </body>
</html>`

    // Set a secure, HttpOnly cookie so subsequent requests are allowed
    const maxAge = Math.max(0, (payload.exp || now) - now)
    const cookie = `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`

    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'set-cookie': cookie },
    })
  } catch (err) {
    return new Response('', { status: 404 })
  }
}

function escapeHtml(s: any) {
  if (s == null) return ''
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return String(s).replace(/[&<>"']/g, (c) => map[c] ?? '')
}
