'use client'

import { cn } from '@/lib/utils'

export function StepAnimate() {
  return (
    <div className={cn('flex flex-col gap-3 p-4 text-xs text-white/70')}>
      <p className="text-white/90 font-medium text-sm">Rest Pose</p>
      <p>
        The 3D model is rendered locked to the node skeleton you placed in Step 2. Each
        body group sits at its <code className="text-white/90">nodeFront</code>{' '}
        <code className="text-white/90">nodeBack</code> pair; each leg sits between its
        hip node and its foot node.
      </p>
      <p className="text-white/50">
        No animation runtime — the model is static. To change the pose, edit nodes in
        Step 2.
      </p>
    </div>
  )
}
