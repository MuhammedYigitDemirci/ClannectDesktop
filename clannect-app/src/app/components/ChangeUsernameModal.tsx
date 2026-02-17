'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface ChangeUsernameModalProps {
  isOpen: boolean
  currentUsername: string
  onClose: () => void
  onConfirm: (newUsername: string) => Promise<void>
  isLoading: boolean
  error: string
  isCooldown?: boolean
  daysRemaining?: number
}

export default function ChangeUsernameModal({
  isOpen,
  currentUsername,
  onClose,
  onConfirm,
  isLoading,
  error,
  isCooldown = false,
  daysRemaining = 0,
}: ChangeUsernameModalProps) {
  const [newUsername, setNewUsername] = useState('')

  if (!isOpen) return null

  const handleConfirm = async () => {
    await onConfirm(newUsername)
    if (!error) {
      setNewUsername('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-sm w-full mx-4 border border-[#333]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Change Username</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Cooldown Warning */}
        {isCooldown && (
          <div className="mb-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3">
            <p className="text-yellow-400 text-sm font-medium">
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left until you can change your username again
            </p>
          </div>
        )}

        {/* Future Cooldown Warning */}
        {!isCooldown && (
          <div className="mb-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3">
            <p className="text-yellow-400 text-sm font-medium">
              Once you change your username, you won't be able to change it for 7 days
            </p>
          </div>
        )}

        {/* Current Username */}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Current Username</label>
          <div className="bg-[#252525] rounded-lg px-4 py-3 text-white">
            @{currentUsername}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-600/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* New Username Input */}
        {!isCooldown && (
          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-2">New Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              disabled={isLoading}
              className="w-full bg-[#252525] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#ff4234] transition-colors disabled:opacity-50"
            />
            <p className="text-gray-500 text-xs mt-2">
              Username must be 3-20 characters, alphanumeric and underscores only
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {isCooldown ? 'Close' : 'Cancel'}
          </button>
          {!isCooldown && (
            <button
              onClick={handleConfirm}
              disabled={isLoading || !newUsername.trim()}
              className="flex-1 bg-[#ff4234] hover:bg-red-600 disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {isLoading ? 'Changing...' : 'Confirm'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

