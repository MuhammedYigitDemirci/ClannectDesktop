import React from 'react'
import { X, AlertCircle } from 'lucide-react'

interface WarningModalProps {
  isOpen: boolean
  title: string
  message: string
  onClose: () => void
  confirmText?: string
  onConfirm?: () => void
  cooldownTime?: string
}

export const WarningModal: React.FC<WarningModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  confirmText = 'OK',
  onConfirm,
  cooldownTime,
}) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--clannect-bg-secondary)] border border-[#ff4234]/30 rounded-xl shadow-2xl max-w-md mx-4 overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ff4234]/20 to-[#d63222]/20 px-6 py-5 border-b border-[#ff4234]/20 flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle size={24} className="text-[#ff4234] flex-shrink-0 mt-0.5" />
            <h2 className="text-lg font-bold text-[var(--clannect-text-primary)]">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--clannect-text-secondary)] hover:text-[var(--clannect-text-primary)] transition-colors flex-shrink-0 ml-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-[var(--clannect-text-secondary)] text-sm leading-relaxed mb-4">
            {message}
          </p>
          {cooldownTime && (
            <div className="bg-[#ff4234]/10 border border-[#ff4234]/30 rounded-lg p-4">
              <p className="text-[var(--clannect-text-secondary)] text-xs uppercase tracking-wider font-semibold mb-1">
                Time Remaining
              </p>
              <p className="text-[#ff4234] text-2xl font-bold">
                {cooldownTime}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--clannect-bg-tertiary)]/50 border-t border-[var(--clannect-border)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-transparent border border-[var(--clannect-border)] text-[var(--clannect-text-primary)] font-semibold hover:bg-[var(--clannect-hover)] transition-colors"
          >
            Close
          </button>
          {onConfirm && (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#ff4234] to-[#d63222] text-white font-semibold hover:from-[#d63222] hover:to-[#b82a1a] transition-all duration-200 shadow-lg hover:shadow-[#ff4234]/50"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
