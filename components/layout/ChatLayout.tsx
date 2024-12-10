'use client'
import React from 'react'
import Header from './Header'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

const ChatLayout = ({
  children,
}: Readonly<{
  children?: React.ReactNode;
}>) => {

  const pathname = usePathname();
  const excludeHeaderFooter = ["/chats"];
  const shouldShowHeaderFooter = !excludeHeaderFooter.includes(pathname);

  return (
    <div>
      {shouldShowHeaderFooter && <Header />}
      <main className="flex-grow flex flex-col">{children}</main>
      {shouldShowHeaderFooter && <Footer />}
    </div>
  )
}

export default ChatLayout