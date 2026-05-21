'use client'

import { AdminFrame } from '../_lib/AdminFrame'
import { StudioCanvas } from '../_lib/StudioCanvas'
import { PickSidebar } from './PickSidebar'

export default function PickPage() {
  return (
    <AdminFrame
      scene={<StudioCanvas>{null}</StudioCanvas>}
      sidebar={<PickSidebar />}
    />
  )
}
