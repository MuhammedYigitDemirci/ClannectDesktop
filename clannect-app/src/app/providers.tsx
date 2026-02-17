'use client'

import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply theme on initial load
    const applyTheme = (selectedTheme: string) => {
      const root = document.documentElement
      const isDark = selectedTheme === 'dark' || (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    // Apply font size on initial load
    const applyFontSize = (size: string) => {
      const root = document.documentElement
      root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large')
      root.classList.add(`font-size-${size}`)
    }

    const storedTheme = localStorage.getItem('theme') || 'system'
    const storedFontSize = localStorage.getItem('fontSize') || 'medium'
    
    applyTheme(storedTheme)
    applyFontSize(storedFontSize)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const currentTheme = localStorage.getItem('theme') || 'system'
      if (currentTheme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return <>{children}</>
}
