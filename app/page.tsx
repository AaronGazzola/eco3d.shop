'use client'

import { useCreatureStore } from './page.stores'
import { SkeletonScene } from './game/SkeletonScene'
import { ConfigPanel } from './game/ConfigPanel'
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

export default function HomePage() {
  const { config, showAttractor } = useCreatureStore()

  return (
    <SidebarProvider
      className="h-screen overflow-hidden bg-[#0a0a0a]"
      style={{ '--sidebar-width': '20rem' } as React.CSSProperties}
    >
      <SidebarInset className="relative overflow-hidden">
        <SkeletonScene config={config} showAttractor={showAttractor} />
        <SidebarTrigger className="absolute top-3 right-3 z-10 text-white/50 hover:text-white hover:bg-white/15 [&_svg]:size-4" />
      </SidebarInset>
      <Sidebar side="right" collapsible="offcanvas">
        <SidebarContent className="overflow-y-auto bg-[#0f0f0f]">
          <ConfigPanel />
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}
