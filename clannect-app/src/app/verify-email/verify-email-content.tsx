'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'

export default function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the token and type from URL params
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')

        // Validate we have the token
        if (!token_hash || type !== 'email_change') {
          console.error('Missing verification token or invalid type')
          setVerificationStatus('error')
          setErrorMessage('Invalid verification link. Please request a new email confirmation.')
          return
        }

        // Verify the token with Supabase
        // Note: verifyOtp works without requiring authentication
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: 'email_change',
          token_hash: token_hash,
          email: '', // Email will be extracted from token by Supabase
        })

        if (verifyError) {
          console.error('Verification error:', verifyError)
          
          if (verifyError.message.includes('expired')) {
            setErrorMessage('This verification link has expired. Please request a new one from your settings.')
          } else if (verifyError.message.includes('invalid')) {
            setErrorMessage('This verification link is invalid or has already been used.')
          } else {
            setErrorMessage(verifyError.message || 'Failed to verify your email. Please try again.')
          }
          
          setVerificationStatus('error')
          return
        }

        // Get the updated user after verification
        const { data: { user: updatedUser }, error: refreshError } = await supabase.auth.getUser()

        if (refreshError || !updatedUser) {
          console.error('Error refreshing user:', refreshError)
          setVerificationStatus('error')
          setErrorMessage('Email verified, but could not confirm the change. Please check your email.')
          return
        }

        setNewEmail(updatedUser.email || '')
        // Notify server to sync `profiles.email` with auth user
        try {
          await fetch('/api/confirm-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: updatedUser.id, email: updatedUser.email }),
          })
        } catch (err) {
          console.error('Error syncing profile email:', err)
        }

        setVerificationStatus('success')

        // Redirect to login after 3 seconds so they can log in with new email
        setTimeout(() => {
          router.push('/login')
        }, 3000)

      } catch (err) {
        console.error('Exception during email verification:', err)
        setVerificationStatus('error')
        setErrorMessage('An unexpected error occurred. Please try again.')
      }
    }

    verifyEmail()
  }, [searchParams, router, supabase])

  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/ClannectLogo.png"
            alt="Clannect"
            width={140}
            height={40}
            className="h-auto w-auto"
            priority
          />
        </div>

        {/* Verification Card */}
        <div className="bg-[#1f1f1f] rounded-xl border border-gray-800 p-8">
          {verificationStatus === 'loading' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader size={48} className="text-[#ff4234] animate-spin" />
              </div>
              <h1 className="text-white text-2xl font-bold">Verifying Email</h1>
              <p className="text-gray-400">Please wait while we verify your email address...</p>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle size={64} className="text-green-500" />
              </div>
              <h1 className="text-white text-2xl font-bold">Email Verified!</h1>
              <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4">
                <p className="text-green-400 text-sm">
                  Your email has been successfully changed to:
                </p>
                <p className="text-green-300 font-semibold text-sm mt-2 break-all">
                  {newEmail}
                </p>
              </div>
              <p className="text-gray-400 text-sm">
                Redirecting to login so you can sign in with your new email...
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 mt-4"
              >
                Go to Login Now
              </button>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle size={64} className="text-red-500" />
              </div>
              <h1 className="text-white text-2xl font-bold">Verification Failed</h1>
              <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4">
                <p className="text-red-400 text-sm">
                  {errorMessage}
                </p>
              </div>
              <div className="space-y-2 pt-4">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-[#ff4234] hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200"
                >
                  Back to Signup
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-8 bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs text-center">
            This page uses a secure token to verify your email change. If you didn't request this change, please contact support immediately.
          </p>
        </div>
      </div>
    </div>
  )
}
