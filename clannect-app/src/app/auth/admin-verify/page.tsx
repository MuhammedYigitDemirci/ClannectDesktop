import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminVerify() {
  // Magic-link based admin verification removed.
  // Always redirect to the admin application verify page.
  const reqHeaders = await headers()
  const host = reqHeaders.get('host') || ''

  // If this is requested from the app host or any host, forward to the admin site.
  const adminUrl = 'https://admin.clannect.com/auth/admin-verify'
  return redirect(adminUrl)
}
