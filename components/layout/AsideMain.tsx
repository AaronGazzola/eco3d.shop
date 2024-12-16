'use client'
import React, { useEffect, useState } from 'react'

// Components
import ChatHeader from './ChatHeader'
import ChatBox from './ChatBox'
import ChatDescription from './ChatDescription';

interface AsideMainProps {
  setIsToggle: React.Dispatch<React.SetStateAction<boolean>>;
  isToggle: boolean
}

const AsideMain = ({ setIsToggle, isToggle }: AsideMainProps) => {

  const [isPromptSubmitted, setIsPromptSubmitted] = useState(false);
  const [chatModal, setChatModal] = useState(false);

  useEffect(() => {
    if (isPromptSubmitted) {
      setChatModal(!chatModal)
    }
  }, [isPromptSubmitted])

  return (
    <>
      <ChatHeader setIsToggle={setIsToggle} isToggle={isToggle} isPromptSubmitted={isPromptSubmitted} />
      {
        isPromptSubmitted ?
          <ChatDescription />
          :
          <ChatBox isPromptSubmitted={isPromptSubmitted} setIsPromptSubmitted={setIsPromptSubmitted} />
      }
    </>
  )
}

export default AsideMain
