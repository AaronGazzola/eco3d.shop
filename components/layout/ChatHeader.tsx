import Image from 'next/image'
import React from 'react'


// Prosp Types
interface ChatHeaderProps {
  setIsToggle: React.Dispatch<React.SetStateAction<boolean>>;
  isToggle: boolean
  isPromptSubmitted: boolean
}

const ChatHeader = ({ setIsToggle, isToggle, isPromptSubmitted }: ChatHeaderProps) => {
  return (
    <>
      <div className='flex justify-between items-center p-4'>
        <div className='flex justify-evenly items-center gap-6'>
          {
            isToggle &&
            <div className='bg-[#222241] px-4 py-3 h-fit border rounded-[10px] border-[#424269] w-auto'>
              <Image src='/svg/logo.svg' alt='Logo' width={37} height={42} />
            </div>
          }
          <Image src={'/svg/left-arrow.svg'} className='cursor-pointer' width={10} height={11} alt='Back' onClick={() => setIsToggle(!isToggle)} />
          <h2>Name Chat</h2>
          <button className='flex items-center justify-between gradient-border-wrapper gap-2 bg-[#353559] px-5 py-[6px]'>
            <h3 className='text-xs'>MyAI.Quest</h3>
            <span className='h-1 w-1 bg-[#B8E9FF] rounded-full'></span>
          </button>
        </div >
        <div>
          <div className='flex justify-between items-center gap-14'>
            {
              isPromptSubmitted &&
              <div>
                <button className='flex items-center justify-between gradient-border-wrapper gap-2 bg-[#353559] px-4 py-[7px]'>
                  <Image src={'/svg/share-icon.svg'} color='#8181A1' className='cursor-pointer' width={18} height={18} alt='Share' />
                  <h3 className='text-xs'>Share</h3>
                </button>
              </div>
            }
            <div className='flex justify-between items-center gap-3'>
              <h3>Aaron</h3>
              <div className='flex justify-center rounded-full border border-[#50B5FF] bg-cover bg-center w-[37px] h-[37px] cursor-pointer' style={{ backgroundImage: "url('/svg/profile-image.svg')" }}>
                <button className='text-white'>A</button>
              </div>
            </div>
          </div>
        </div>
      </div >
    </>
  )
}

export default ChatHeader
