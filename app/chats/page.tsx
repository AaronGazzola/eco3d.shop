'use client'
import React, { useEffect, useState } from 'react'

// Component
import AsideMain from '@/components/layout/AsideMain'
import Sidebar from '@/components/layout/DashboardSidebar'

const ChatPage = () => {

  const [isToggle, setIsToggle] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (isToggle) {
      const timeout = setTimeout(() => setIsHidden(true), 300);
      return () => clearTimeout(timeout);
    } else {
      setIsHidden(false);
    }
  }, [isToggle]);

  return (

    <div className="bg-[#00002C] min-h-screen w-full relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-[800px] h-[2200px] bg-no-repeat bg-contain z-0"
        style={{ backgroundImage: `url('/svg/chatpage-bg1.svg')` }}
      >
      </div>
      <div
        className="absolute bottom-1 left-1/2 transform -translate-x-[30%] w-[1532px] h-[400px] bg-no-repeat bg-contain z-0"
        style={{ backgroundImage: `url('/svg/chatpage-bg2.svg')` }}
      >
      </div>
      <div className="flex gap-12 text-white h-screen p-12 relative z-10">
        <div
          className={`max-w-[430px] transform transition-all duration-300 ease-in-out 
        ${isToggle ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100 pointer-events-auto'}
        ${isHidden ? 'hidden' : 'block'}`}
        >
          <Sidebar />
        </div>
        <div className="w-full">
          <AsideMain setIsToggle={setIsToggle} isToggle={isToggle} />
        </div>
      </div>
    </div>
  )
}

export default ChatPage