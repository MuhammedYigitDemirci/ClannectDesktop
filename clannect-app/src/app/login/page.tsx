'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSending, setResetSending] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value.slice(0, 254)
    setEmail(newEmail)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value.slice(0, 64)
    setPassword(newPassword)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Trim whitespace from email and password for consistency
      const trimmedEmail = email.trim().toLowerCase()
      const trimmedPassword = password.trim()

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      })

      if (error) {
        // Check if it's an email confirmation error
        if (error.message.includes('Email not confirmed') || error.message.includes('email not confirmed')) {
          setError('⚠️ Please confirm your email before logging in. Check your inbox for the confirmation link.')
        } else {
          setError(error.message)
        }
        setLoading(false)
        return
      }

      router.push('/hub')
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#181818] flex flex-col relative">
      {/* Logo - Top Left Corner - Mobile optimized */}
      <div className="absolute top-4 left-4 sm:left-8 z-10">
        <img
          src="/ClannectLogo.png"
          alt="Clannect Logo"
          className="w-36 sm:w-44 h-20 sm:h-24 object-contain select-none pointer-events-none"
          draggable={false}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:p-4 pt-32 sm:pt-0">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-12">
          {/* Left side - Graphic */}
          <div className="hidden lg:flex flex-1 justify-center">
            <img
              src="/LoginSignupGraphic.png"
              alt="Login Graphic"
              className="w-full h-auto object-contain max-w-4xl select-none pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Right side - Form - Mobile optimized */}
          <div className="w-full max-w-sm sm:max-w-none lg:max-w-md bg-gradient-to-b from-[#252525] to-[#1f1f1f] rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-600 sm:border-gray-700 transform transition-all">
          <div className="text-center mb-6 sm:mb-6">
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff4234] to-[#ff6b5b]">
              Welcome Back,<br />Warrior!
            </h1>
            <p className="text-gray-300 text-sm sm:text-xs mt-2 sm:mt-1 font-medium tracking-wide">Sign in to your legendary journey</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-900 to-red-800 bg-opacity-40 border border-red-600 rounded-lg animate-pulse">
              <p className="text-red-200 text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-4">
            <div className="transform transition-all hover:scale-102">
              <label htmlFor="email" className="block text-xs sm:text-xs font-bold text-white mb-2 sm:mb-1 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Email Address..."
                value={email}
                onChange={handleEmailChange}
                required
                className="w-full px-5 sm:px-4 py-3 sm:py-2.5 bg-gradient-to-r from-[#2a2a2a] to-[#252525] border border-gray-600 hover:border-gray-500 rounded-lg focus:ring-2 focus:ring-[#ff4234] focus:border-transparent outline-none transition placeholder:text-gray-500 placeholder:font-medium text-white font-medium text-base sm:text-sm shadow-md"
              />
            </div>

            <div className="transform transition-all hover:scale-102">
              <label htmlFor="password" className="block text-xs sm:text-xs font-bold text-white mb-2 sm:mb-1 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Password..."
                value={password}
                onChange={handlePasswordChange}
                required
                className="w-full px-5 sm:px-4 py-3 sm:py-2.5 bg-gradient-to-r from-[#2a2a2a] to-[#252525] border border-gray-600 hover:border-gray-500 rounded-lg focus:ring-2 focus:ring-[#ff4234] focus:border-transparent outline-none transition placeholder:text-gray-500 placeholder:font-medium text-white font-medium text-base sm:text-sm shadow-md"
              />
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-[#ff4234] text-sm font-semibold hover:underline transition focus:outline-none"
              >
                Forgot Your Password?
              </button>
            </div>

            {showResetModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black bg-opacity-50"
                  onClick={() => setShowResetModal(false)}
                />

                <div className="relative w-full max-w-md mx-4 bg-[#111111] border border-gray-700 rounded-2xl p-6 shadow-2xl z-10">
                  <h2 className="text-lg font-bold text-white mb-3">Reset Password</h2>
                  <p className="text-gray-300 text-sm mb-4">
                    Please enter the email address associated with your account so we can help you reset your password.
                  </p>

                  <input
                    type="email"
                    placeholder="Email Address..."
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value.slice(0, 254))}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#2a2a2a] to-[#252525] border border-gray-600 rounded-lg focus:ring-2 focus:ring-[#ff4234] outline-none text-white mb-4"
                  />

                  {resetMessage && (
                    <div className="mb-3 text-sm text-green-300 font-medium">{resetMessage}</div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="px-4 py-2 rounded-lg bg-transparent border border-gray-600 text-gray-300 hover:border-gray-500"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setResetMessage(null)
                        setResetSending(true)
                        const emailTrim = resetEmail.trim().toLowerCase()
                        if (!emailTrim) {
                          setResetMessage('Please enter a valid email')
                          setResetSending(false)
                          return
                        }

                        try {
                          const { data, error } = await supabase.auth.resetPasswordForEmail(emailTrim, {
                            redirectTo: 'https://app.clannect.com/auth/password-reset',
                          })

                          if (error) {
                            setResetMessage(error.message || 'Failed to send reset email')
                            setResetSending(false)
                            return
                          }

                          setResetMessage('If an account exists, a password reset email has been sent.')
                          setResetSending(false)
                          // close modal after a short delay
                          setTimeout(() => {
                            setShowResetModal(false)
                            setResetEmail('')
                            setResetMessage(null)
                          }, 1500)
                        } catch (err) {
                          setResetMessage('An unexpected error occurred')
                          setResetSending(false)
                        }
                      }}
                      disabled={resetSending}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff4234] to-[#ff6b5b] text-white font-semibold disabled:opacity-60"
                    >
                      {resetSending ? 'Sending...' : 'Send Request'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ff4234] to-[#ff6b5b] hover:from-[#ff3020] hover:to-[#ff5541] disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 sm:py-2.5 px-5 sm:px-4 rounded-lg transition duration-300 shadow-lg hover:shadow-2xl disabled:shadow-md text-base sm:text-sm transform hover:scale-105 active:scale-95 disabled:transform-none disabled:hover:shadow-md uppercase tracking-wider font-semibold"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-300 text-sm sm:text-sm mt-5 sm:mt-4 font-semibold">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#ff4234] hover:text-[#ff6b5b] font-bold transition duration-300 underline decoration-2">
              Sign up
            </Link>
          </p>

          <div className="mt-6 sm:mt-6 pt-5 sm:pt-4 border-t border-gray-600 text-center text-xs sm:text-xs text-gray-400">
            <p className="font-semibold">💖 Connect, Compete, Collaborate.</p>
          </div>
          </div>
        </div>
      </div>

      {/* Footer - Always visible at bottom */}
      <footer className="w-full border-t border-gray-800 py-4 px-4 bg-[#181818]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center text-gray-500 text-xs sm:text-sm gap-4 sm:gap-0">
          <p>&copy; 2026 Clannect. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-[#ff4234] transition">Privacy</Link>
            <Link href="#" className="hover:text-[#ff4234] transition">Terms</Link>
            <Link href="#" className="hover:text-[#ff4234] transition">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
