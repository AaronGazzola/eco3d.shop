import AsideMain from '@/components/layout/AsideMain'
import Sidebar from '@/components/layout/DashboardSidebar'
import React from 'react'

const index = () => {
  return (
    <div className='bg-[#00002C] min-h-screen w-full '>
      <div className='grid gap-12 text-white h-screen p-12'>
        <div className='col-start-1 col-end-3 max-w-[430px]'>
          <Sidebar />
        </div>
        <div className='border col-start-3 col-end-12'>
          <AsideMain />
        </div>
      </div>
    </div>
  )
}

export default index
