'use client'

import { Suspense } from 'react'
import HomeContent from './home-content'
import GlobalLoading from './components/GlobalLoading'

export default function Home() {
  return (
    <Suspense fallback={<GlobalLoading />}>
      <HomeContent />
    </Suspense>
  )
}
