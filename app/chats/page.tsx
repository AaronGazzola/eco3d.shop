import AsideMain from '@/components/layout/AsideMain'
import Sidebar from '@/components/layout/DashboardSidebar'
import React from 'react'

const index = () => {
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
        <div className="max-w-[430px]">
          <Sidebar />
        </div>
        <div className="w-full">
          <AsideMain />
        </div>
      </div>
    </div>
  )
}

export default index