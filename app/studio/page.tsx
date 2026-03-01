'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { StudioScene } from './StudioScene'
import { StudioSidebar } from './StudioSidebar'

export default function StudioPage() {
  return (
    <SidebarProvider
      className="h-screen overflow-hidden bg-[#0a0a0a]"
      style={{ '--sidebar-width': '20rem' } as React.CSSProperties}
    >
      <SidebarInset className="relative overflow-hidden">
        <StudioScene />
        <SidebarTrigger className="absolute top-3 right-3 z-10 text-white/50 hover:text-white hover:bg-white/15 [&_svg]:size-4" />
      </SidebarInset>
      <Sidebar side="right" collapsible="offcanvas">
        <SidebarContent className="overflow-y-auto bg-[#0f0f0f]">
          <StudioSidebar />
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}
