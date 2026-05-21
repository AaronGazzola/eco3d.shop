'use client'

import { AdminFrame } from '../_lib/AdminFrame'
import { GroupScene } from './GroupScene'
import { GroupSidebar } from './GroupSidebar'

export default function GroupPage() {
  return (
    <AdminFrame
      scene={<GroupScene />}
      sidebar={<GroupSidebar />}
    />
  )
}
