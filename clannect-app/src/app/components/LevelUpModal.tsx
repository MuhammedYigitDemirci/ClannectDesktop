'use client'

import { Award } from 'lucide-react'

interface LevelUpModalProps {
  isOpen: boolean
  newLevel: number
  cloinReward: number
  onClose: () => void
}

export default function LevelUpModal({ isOpen, newLevel, cloinReward, onClose }: LevelUpModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-8 max-w-sm w-full mx-4 border border-[#333]">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Level Up!</h2>
          <p className="text-gray-300">Congratulations on reaching</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">Level {newLevel}</p>
        </div>

        {/* Reward Section */}
        <div className="bg-[#252525] rounded-lg p-6 mb-6 flex items-center justify-center gap-4">
          <div className="bg-[#1a1a1a] rounded-lg p-3 flex-shrink-0">
            <img 
              src="/Visuals/ClannectCoin.png"
              alt="Cloin"
              className="w-8 h-8 pointer-events-none select-none"
              draggable={false}
            />
          </div>
          <div className="text-white text-xl font-bold">+{cloinReward} Cloin</div>
        </div>

        {/* OK Button */}
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  )
}
