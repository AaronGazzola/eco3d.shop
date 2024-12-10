import Image from 'next/image';
import React from 'react'
import { VscSettings } from "react-icons/vsc";
import { FaAngleDown } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import SideMenu from '../ui/DashboardSideMenu';

const Sidebar = () => {
  return (
    <div className='flex flex-col gap-6 h-full'>
      <div className='flex justify-between items-center bg-[#222241] border border-[#424269] py-4 px-6 rounded-[10px] max-h-[75px]'>
        <div className='flex items-center gap-7'>
          <Image src='/svg/logo.svg' alt='Logo' width={38} height={38} />
          <h1 className='text-xl font-semibold mb-1'>My Chats</h1>
        </div>
        <div>
          <VscSettings color='#8181A1' className='w-6 h-6' />
        </div>
      </div>

      <div className='flex justify-between items-center bg-[#222241] border border-[#424269] py-4 px-6 rounded-[10px] h-full'>
        <div className='flex items-center gap-7'>

        </div>
        <div className='w-full'>
          <SideMenu text='Hello' heading="Folders" icons={[<FaPlus key="1" />, <FaAngleDown key="2" className='w-4 h-4' />]} />
        </div>
        <div>

        </div>
      </div>
    </div>
  )
}

export default Sidebar
