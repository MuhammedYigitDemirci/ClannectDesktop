'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Mail, ArrowRight } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Load pending email from localStorage if present (covers refresh scenarios)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('clannect_pending_email')
        if (stored) setPendingEmail(stored)
      }
    } catch (err) {
      // ignore
    }
  }, [])

  // Generate random banner gradient
  const generateBannerGradient = () => {
    const gradients = [
      'from-blue-600 to-purple-600',
      'from-purple-600 to-pink-600',
      'from-pink-600 to-red-600',
      'from-red-600 to-orange-600',
      'from-orange-600 to-yellow-600',
      'from-yellow-600 to-green-600',
      'from-green-600 to-teal-600',
      'from-teal-600 to-cyan-600',
      'from-cyan-600 to-blue-600',
      'from-indigo-600 to-purple-600',
      'from-rose-600 to-pink-600',
      'from-emerald-600 to-green-600',
      'from-violet-600 to-purple-600',
      'from-fuchsia-600 to-pink-600',
      'from-amber-600 to-orange-600',
    ]
    return gradients[Math.floor(Math.random() * gradients.length)]
  }

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return { level: 0, text: '', color: '' }
    
    const hasLetter = /[a-zA-Z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    const isLongEnough = pass.length >= 8
    
    let strength = 0
    if (hasLetter) strength++
    if (hasNumber) strength++
    if (isLongEnough) strength++
    
    if (strength === 0 || pass.length < 8) return { level: 1, text: 'Weak', color: '#ff4234' }
    if (strength === 1) return { level: 2, text: 'Fair', color: '#ff8c00' }
    if (strength === 2) return { level: 3, text: 'Good', color: '#ffdb58' }
    return { level: 4, text: 'Strong', color: '#52b788' }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value.slice(0, 254)
    setEmail(newEmail)
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 25)
    const validChars = /^[a-zA-Z0-9_.]*$/
    
    if (!validChars.test(value) && value.length > 0) {
      setUsernameError('Usernames can only include letters, numbers, "_" and "."')
    } else {
      setUsernameError(null)
    }
    
    setUsername(value)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value.slice(0, 64)
    setPassword(newPassword)

    // Check password requirements
    const hasLetter = /[a-zA-Z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    
    if (newPassword.length > 0 && (!hasLetter || !hasNumber)) {
      setPasswordError('Password must contain at least one letter and one number')
    } else if (newPassword.length < 8 && newPassword.length > 0) {
      setPasswordError('Password must be at least 8 characters')
    } else {
      setPasswordError(null)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validate username
    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      setLoading(false)
      return
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      setError('Usernames can only include letters, numbers, "_" and "."')
      setLoading(false)
      return
    }

    // Validate password requirements
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    
    if (!hasLetter || !hasNumber) {
      setError('Password must contain at least one letter and one number')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (password.length > 64) {
      setError('Password must not exceed 64 characters')
      setLoading(false)
      return
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // Trim whitespace from email
      const trimmedEmail = email.trim()
      const trimmedPassword = password.trim()

      // Ensure Supabase sends the verification link to our /auth/verified route
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      
        // Pre-check profiles table to give an immediate friendly error if email already exists
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', trimmedEmail)
            .single()

          if (existingProfile) {
            setError('This email is already connected to another Clannect account.')
            setLoading(false)
            return
          }
        } catch (checkErr) {
          // If the check fails for any reason, continue to signup and rely on server-side errors
          console.warn('Email uniqueness check failed:', checkErr)
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: { emailRedirectTo: `${origin}/auth/verified` }
      })

      if (authError) {
        const raw = authError.message || ''
        if (/already/i.test(raw) || /registered/i.test(raw)) {
          setError('This email is already connected to another Clannect account.')
        } else {
          setError(raw || 'Failed to create account')
        }
        setLoading(false)
        return
      }

      // ⚠️ CRITICAL: Call server endpoint to trigger confirmation email
      if (authData?.user) {
        try {
          console.log('[Signup] Calling /api/trigger-signup-email for:', trimmedEmail)
          
          const emailResponse = await fetch('/api/trigger-signup-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: trimmedEmail,
              redirectUrl: `${origin}/auth/verified`,
            }),
          })

          const emailData = await emailResponse.json()
          
          if (!emailResponse.ok) {
            console.error('[Signup] Email trigger failed:', emailData)
          } else {
            console.log('[Signup] ✅ Email triggered successfully')
          }
        } catch (emailErr) {
          console.error('[Signup] Email endpoint error:', emailErr)
        }
      }

      // Save chosen username and email so they can be used after email verification
      try {
        if (typeof window !== 'undefined' && username && username.trim().length > 0) {
          localStorage.setItem('clannect_pending_username', username.trim())
        }
        if (typeof window !== 'undefined' && trimmedEmail) {
          localStorage.setItem('clannect_pending_email', trimmedEmail)
          setPendingEmail(trimmedEmail)
        }
      } catch (err) {
        console.warn('Could not persist pending data:', err)
      }

      // Show verification modal (do not auto-redirect)
      setSuccess(true)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setShowVerificationModal(true)
      setLoading(false)
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
              alt="Signup Graphic"
              className="w-full h-auto object-contain max-w-4xl select-none pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Right side - Form - Mobile optimized */}
          <div className="w-full max-w-sm sm:max-w-none lg:max-w-md bg-gradient-to-b from-[#252525] to-[#1f1f1f] rounded-3xl shadow-2xl p-5 sm:p-5 border border-gray-600 sm:border-gray-700 transform transition-all">
          <div className="text-center mb-4 sm:mb-4">
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff4234] to-[#ff6b5b]">
              Oh, A New<br />Warrior?
            </h1>
            <p className="text-gray-300 text-sm sm:text-xs mt-2 sm:mt-1 font-medium tracking-wide">Join the legendary community</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-gradient-to-r from-red-900 to-red-800 bg-opacity-40 border border-red-600 rounded-lg animate-pulse">
              <p className="text-red-200 text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-2.5 sm:space-y-3">
            <div className="transform transition-all hover:scale-102">
              <label htmlFor="email" className="block text-xs sm:text-xs font-bold text-white mb-1.5 sm:mb-1 uppercase tracking-wider">
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
              <label htmlFor="username" className="block text-xs sm:text-xs font-bold text-white mb-1.5 sm:mb-1 uppercase tracking-wider">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Username..."
                value={username}
                onChange={handleUsernameChange}
                required
                className={`w-full px-5 sm:px-4 py-3 sm:py-2.5 bg-gradient-to-r from-[#2a2a2a] to-[#252525] border rounded-lg focus:ring-2 focus:border-transparent outline-none transition placeholder:text-gray-500 placeholder:font-medium text-white font-medium shadow-md text-base sm:text-sm ${
                  usernameError ? 'border-red-600 focus:ring-red-500' : 'border-gray-600 hover:border-gray-500 focus:ring-[#ff4234]'
                }`}
              />
              {usernameError ? (
                <p className="text-xs text-red-400 mt-1.5 font-semibold">⚠️ {usernameError}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1 font-medium">3-25 chars, letters/numbers/_ and . only</p>
              )}
            </div>

            <div className="transform transition-all hover:scale-102">
              <label htmlFor="password" className="block text-xs sm:text-xs font-bold text-white mb-1.5 sm:mb-1 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Password..."
                value={password}
                onChange={handlePasswordChange}
                required
                className={`w-full px-5 sm:px-4 py-3 sm:py-2.5 bg-gradient-to-r from-[#2a2a2a] to-[#252525] border rounded-lg focus:ring-2 focus:border-transparent outline-none transition placeholder:text-gray-500 placeholder:font-medium text-white font-medium shadow-md text-base sm:text-sm ${
                  passwordError ? 'border-red-600 focus:ring-red-500' : 'border-gray-600 hover:border-gray-500 focus:ring-[#ff4234]'
                }`}
              />
              
              {/* Password Strength Bar */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="flex-1 h-1.5 rounded-full transition-all duration-300 shadow-sm"
                        style={{
                          backgroundColor:
                            level <= getPasswordStrength(password).level
                              ? getPasswordStrength(password).color
                              : '#404040',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: getPasswordStrength(password).color }}>
                    Strength: {getPasswordStrength(password).text}
                  </p>
                </div>
              )}
              
              {passwordError ? (
                <p className="text-xs text-red-400 mt-1.5 font-semibold">⚠️ {passwordError}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1 font-medium">Min 8, Max 64 chars. Letter & number required</p>
              )}
            </div>

            <div className="transform transition-all hover:scale-102">
              <label htmlFor="confirmPassword" className="block text-xs sm:text-xs font-bold text-white mb-1.5 sm:mb-1 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm Your Password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full px-5 sm:px-4 py-3 sm:py-2.5 bg-gradient-to-r from-[#2a2a2a] to-[#252525] border rounded-lg focus:ring-2 focus:border-transparent outline-none transition placeholder:text-gray-500 placeholder:font-medium text-white font-medium shadow-md text-base sm:text-sm ${
                  password && confirmPassword && password !== confirmPassword ? 'border-red-600 focus:ring-red-500' : 'border-gray-600 hover:border-gray-500 focus:ring-[#ff4234]'
                }`}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1.5 font-semibold">⚠️ Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-[#ff4234] to-[#ff6b5b] hover:from-[#ff3020] hover:to-[#ff5541] disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 sm:py-2.5 px-5 sm:px-4 rounded-lg transition duration-300 shadow-lg hover:shadow-2xl disabled:shadow-md text-base sm:text-sm mt-4 sm:mt-3 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:hover:shadow-md uppercase tracking-wider font-semibold"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-gray-300 text-sm sm:text-sm mt-4 sm:mt-4 font-semibold">
            Already have an account?{' '}
            <Link href="/login" className="text-[#ff4234] hover:text-[#ff6b5b] font-bold transition duration-300 underline decoration-2">
              Sign in
            </Link>
          </p>

          <div className="mt-4 sm:mt-4 pt-3 sm:pt-3 border-t border-gray-600 text-center text-xs sm:text-xs text-gray-400">
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

      {/* Email Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#252525] to-[#1f1f1f] rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-700 animate-in fade-in zoom-in duration-300">
            {/* Mail Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-[#ff4234] to-[#ff6b5b] p-4 rounded-full">
                <Mail size={32} className="text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-2xl font-black text-white mb-3">
              Your Adventure Awaits!
            </h2>

            {/* Message */}
            <p className="text-center text-gray-300 text-sm mb-4 font-medium">
              We’ve sent a confirmation email to <span className="text-[#ff4234] font-semibold break-all">{pendingEmail || email}</span>.
              <br />
              Click the button inside to verify your email and unlock your Clannect Hub.
            </p>

            {/* Secondary Info */}
            <p className="text-center text-gray-400 text-xs mt-4 font-medium">
              Didn't receive the email? Check your spam folder.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
