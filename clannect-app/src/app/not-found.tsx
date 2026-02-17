'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Home, AlertTriangle } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#181818] text-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-12">
          <Image
            src="/ClannectLogo.png"
            alt="Clannect"
            width={140}
            height={40}
            className="h-auto w-auto mx-auto mb-8"
            priority
          />
        </div>

        {/* 404 Content */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <AlertTriangle 
                size={120} 
                className="text-[#ff4234]" 
                strokeWidth={1}
              />
              <span className="absolute -top-4 -right-6 text-8xl font-bold text-[#ff4234]/20">404</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-4">
            Page Not Found
          </h1>

          <p className="text-gray-400 text-lg mb-2">
            Oops! We couldn't find what you're looking for.
          </p>
          
          <p className="text-gray-500 text-sm mb-8">
            This page might have been removed, or the link might be broken. Let's get you back on track!
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/hub')}
              className="flex items-center justify-center gap-2 bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              <Home size={20} />
              <span>Go to Hub</span>
            </button>
            
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 bg-[#252525] hover:bg-[#2a2a2a] text-white font-semibold py-3 px-6 rounded-lg border border-gray-700 transition-all duration-200"
            >
              <span>Go Back</span>
            </button>
          </div>
        </div>

        {/* Footer Message */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <p className="text-center text-gray-500 text-sm">
            Need help? Check your URL and try again, or head back to the hub.
          </p>
        </div>
      </div>
    </div>
  )
}
