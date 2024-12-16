"use client"
import React, { useState } from 'react'
import Image from 'next/image'

// Icons
import { Globe, Mic } from 'lucide-react'

const ChatDescription = () => {

  return (
    <div className='flex flex-col justify-center items-center h-full'>
      <div className='max-w-[975px] text-end w-full mb-[14px]'>
        <button className='bg-[#1B1C3D] py-2.5 px-9 border rounded-lg border-[#424269]'>Message</button>
      </div>

      <div className='flex gap-7'>

        <div className='bg-[#222241] px-4 py-3 h-fit border rounded-[10px] border-[#424269]'>
          <Image src='/svg/logo.svg' alt='Logo' width={29} height={33} />
        </div>

        <div className='bg-[#222241CC] border border-[#424269] text-center flex flex-col justify-center items-center rounded-[22px] px-8 py-11 max-w-[890px] gap-4'>
          <h3 className='text-base text-[#898CAF] text-left'>Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of de Finibus Bonorum et Malorum (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, Lorem ipsum dolor sit amet.., comes from a line in section 1.10.32.</h3>

          <h3 className='text-base text-[#898CAF] text-left'>
            Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia.
          </h3>

          <div className='w-[710px]'>

            <div className="mt-10 flex items-center justify-between w-full px-2 py-2 bg-white border rounded-md shadow-sm">
              <div className="flex items-center">
                <Image className='ml-2' src="/svg/chat-logo.svg" alt="Logo" width={40} height={46} />
              </div>

              <div className="flex-grow mx-4 text-black">
                <input
                  type="text"
                  placeholder="Type your prompt here....."
                  className="w-full px-4 py-2 rounded-md focus:outline-none"
                />
              </div>

              <button className="p-2">
                <Image src="/svg/search-icon.svg" alt="Logo" width={40} height={46} />
              </button>
            </div>

            <div className='flex justify-end gap-[10px] w-full mt-4'>
              <Image src="/svg/file-share-icon.svg" alt="Logo" width={24} height={24} className='cursor-pointer' />
              <Mic color='#8181A1' width={20} height={20} className='cursor-pointer' />
              <Globe color='#8181A1' width={20} height={20} className='cursor-pointer' />
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}

export default ChatDescription;