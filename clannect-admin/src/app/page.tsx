import { verifyAdminFromSession } from '@/lib/admin'

export default async function AdminPage() { // Admin Redirection Fix Check.
  // Verify user is admin (session + clannect_admins table check)
  // Middleware already verified this, but call again for page-level assurance
  const admin = await verifyAdminFromSession()

  if (!admin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Not Found</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Welcome, Admin!</h1>
        <p className="mt-4 text-sm text-gray-600">Role: {admin.role}</p>
        <p className="text-xs text-gray-500 mt-2">User ID: {admin.user_uuid}</p>
      </div>
    </main>
  )
}
