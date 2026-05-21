'use client'

import { AdminFrame } from '../_lib/AdminFrame'
import { AnimateScene } from './AnimateScene'
import { AnimateSidebar } from './AnimateSidebar'

export default function AnimatePage() {
  return (
    <AdminFrame
      scene={<AnimateScene />}
      sidebar={<AnimateSidebar />}
    />
  )
}
