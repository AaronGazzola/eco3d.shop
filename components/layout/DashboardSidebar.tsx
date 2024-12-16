'use client'
import Image from 'next/image';
import React from 'react'

// Icons
import { Search } from "lucide-react";
import { VscSettings } from "react-icons/vsc";
import { FaAngleDown } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import { TiPlus } from "react-icons/ti";

// Components
import SideMenu from '../ui/DashboardSideMenu';

// Props Type
interface SideBarProps {
  isToggle: boolean
}

const Sidebar = () => {

  const subTitle = 'Lorem Ipsum has been the industrys standard dummy text ever since the 1500s'

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

      <div className='flex flex-col justify-between gap-3 items-center bg-[#222241] border border-[#424269] py-4 px-6 rounded-[10px] h-full'>
        <div className='flex flex-col items-center gap-7 w-full'>
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search games.."
              className="w-full px-4 py-2 bg-[#353559] rounded-lg focus:outline-none focus:ring-2"
            />
            <div className="absolute inset-y-0 right-3 flex items-center cursor-pointer">
              <Search className="w-5 h-5 text-gray-500 " />
            </div>
          </div>

          <div className='w-full flex flex-col gap-6'>
            <SideMenu isBorderRequired={true} text='Work Chats' heading="Folders" icons={[<FaPlus key="1" />, <FaAngleDown key="2" className='w-4 h-4' />]} />
            <SideMenu isMessageSection={true} text='Lorem Ipsum' heading="Chats" icons={[<FaAngleDown key="2" className='w-4 h-4' />]} subTitle={subTitle} />
          </div>
        </div>
        <div className='w-full'>
          <div
            className={`bg-[#5D91FF] rounded-lg flex justify-between items-center p-4`}
          >
            <h3 className="text-lg font-medium">New Chat</h3>
            <div className='h-7 w-7 text-black rounded-sm bg-[#AEC8FF] flex items-center justify-center cursor-pointer'>
              <TiPlus />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
