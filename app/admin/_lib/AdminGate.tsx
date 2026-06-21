'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/layout.hooks'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useIsStudioAdmin } from './hooks'
import { LoginForm } from './LoginForm'

export function AdminGate({
  title,
  sidebar,
  children,
}: {
  title?: ReactNode
  sidebar?: ReactNode
  children: ReactNode
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

  if (sidebar) {
    return (
      <SidebarProvider
        className="h-screen overflow-hidden bg-[#4a4a4a]"
        style={{ '--sidebar-width': '20rem' } as React.CSSProperties}
      >
        <SidebarInset className="relative overflow-hidden bg-[#4a4a4a]">
          {children}
          <SidebarTrigger className="absolute top-3 right-3 z-10 text-white/50 hover:text-white hover:bg-white/15 [&_svg]:size-4" />
        </SidebarInset>
        <Sidebar side="right" collapsible="offcanvas">
          <SidebarContent className="overflow-y-auto bg-[#333333]">{sidebar}</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    )
  }

  const header = (
    <header className="flex items-center gap-6 border-b border-white/10 bg-[#333333] px-6 py-3">
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/admin/dragons" className="text-white/70 hover:text-white transition-colors">
          Dragons
        </Link>
        <Link href="/admin/pick" className="text-white/40 hover:text-white/70 transition-colors">
          Model studio
        </Link>
      </nav>
      {title && <div className={cn('ml-auto text-sm text-white/50')}>{title}</div>}
    </header>
  )

  return (
    <div className="min-h-screen bg-[#4a4a4a] text-white">
      {header}
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
