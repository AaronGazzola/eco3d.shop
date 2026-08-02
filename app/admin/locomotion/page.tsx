'use client'

import { AdminFrame } from '../_lib/AdminFrame'
import { LocomotionScene } from './LocomotionScene'
import { LocomotionSidebar } from './LocomotionSidebar'

export default function LocomotionPage() {
  return <AdminFrame scene={<LocomotionScene />} sidebar={<LocomotionSidebar />} />
}
