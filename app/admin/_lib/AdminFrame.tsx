'use client'

import { ReactNode } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useAuth } from '@/app/layout.hooks'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsStudioAdmin } from './hooks'
import { LoginForm } from './LoginForm'
import { SidebarShell } from './SidebarShell'

export function AdminFrame({
  scene,
  sidebar,
}: {
  scene: ReactNode
  sidebar: ReactNode
}) {
  const auth = useAuth()
  const { isAdmin, loading } = useIsStudioAdmin()

  if (auth.isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#4a4a4a]">
        <Skeleton className="h-10 w-40 bg-white/10" />
      </div>
    )
  }

  if (!isAdmin) {
    return <LoginForm />
  }

  return (
    <SidebarProvider
      className="h-screen overflow-hidden bg-[#4a4a4a]"
      style={{ '--sidebar-width': '20rem' } as React.CSSProperties}
    >
      <SidebarInset className="relative overflow-hidden">
        {scene}
        <SidebarTrigger className="absolute top-3 right-3 z-10 text-white/50 hover:text-white hover:bg-white/15 [&_svg]:size-4" />
      </SidebarInset>
      <Sidebar side="right" collapsible="offcanvas">
        <SidebarContent className="overflow-y-auto bg-[#333333]">
          <SidebarShell>{sidebar}</SidebarShell>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}
