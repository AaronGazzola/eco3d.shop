'use client'

import Image from 'next/image'
import { StepPick } from './StepPick'

export function StudioSidebar() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <StepPick />
      </div>
      <div className="flex flex-col items-center gap-2 py-4 border-t border-white/8">
        <Image
          src="/images/Authorized_Seller_Badge.png"
          alt="Saber 3D Authorized Seller"
          width={96}
          height={96}
        />
        <p className="text-[10px] text-white/30 text-center">
          3D models designed by{' '}
          <a
            href="https://www.saber-3d.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors"
          >
            Saber3D
          </a>
        </p>
      </div>
    </div>
  )
}
