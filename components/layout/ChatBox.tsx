"use client"
import React, { useState } from 'react'
import Image from 'next/image'

// Icons
import { Globe, Mic } from 'lucide-react'

// Props Type
interface AsideMainProps {
  isPromptSubmitted: boolean
  setIsPromptSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatBox = ({ isPromptSubmitted, setIsPromptSubmitted }: AsideMainProps) => {
  const [activeIndex, setActiveIndex] = useState("All");
  const [prompt, setPrompt] = useState('')

  return (
    <div className='flex justify-center items-center h-full'>
      <div className='bg-[#222241CC] border border-[#424269] text-center flex flex-col justify-center items-center rounded-[22px] px-16 py-11 max-w-[890px] gap-4'>
        <Image src='/svg/logo.svg' alt='Logo' width={57} height={66} />
        <h1 className='text-5xl font-bold'>How Can I help You <span className='text-[#77AAFF]'>Today?</span></h1>
        <h3 className='text-lg text-[#898CAF]'>Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, Lorem Ipsum has been the industrys standard .</h3>
        <div className='flex justify-center items-center gap-11 mt-7'>
          {["All", "Text", "Image", "Video", "Music", "Courses"].map((item, index) => (
            <p
              key={index}
              className={`cursor-pointer font-semibold ${activeIndex === item ? "underline text-[#5488FF]" : "text-[#898CAF]"}`}
              onClick={() => setActiveIndex(item)}
            >
              {item}
            </p>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between w-full px-2 py-2 bg-white border rounded-md shadow-sm">

          <div className="flex items-center">
            <Image className='ml-2' src="/svg/chat-logo.svg" alt="Logo" width={40} height={46} />
          </div>

          <div className="flex-grow mx-4 text-black">
            <input
              type="text"
              placeholder="Type your prompt here....."
              className="w-full px-4 py-2 rounded-md focus:outline-none"
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <button className="p-2" onClick={() => prompt && setIsPromptSubmitted(!isPromptSubmitted)}>
            <Image src="/svg/search-icon.svg" alt="Logo" width={40} height={46} />
          </button>
        </div>
        <div className='flex justify-end gap-[10px] w-full'>
          <Image src="/svg/file-share-icon.svg" alt="Logo" width={24} height={24} className='cursor-pointer' />
          <Mic color='#8181A1' width={20} height={20} className='cursor-pointer' />
          <Globe color='#8181A1' width={20} height={20} className='cursor-pointer' />
        </div>
      </div>
    </div>
  )
}

export default ChatBox;