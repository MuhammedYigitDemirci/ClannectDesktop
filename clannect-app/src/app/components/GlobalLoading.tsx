'use client'

export default function GlobalLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#181818]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff4234] mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
