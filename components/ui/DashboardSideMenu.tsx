interface sidebarMenuProps {
  text: string;
  heading: string;
  icons: JSX.Element[]
}

const SideMenu = ({ text, heading, icons }: sidebarMenuProps) => {
  return (
    <div className='w-full flex flex-col gap-3'>
      <div className="flex justify-between items-center">
        <h3 className='text-lg'>{heading}</h3>
        <div className="flex justify-between items-center gap-2">
          {icons.map((Icon, index) => (
            <div className='bg-[#474770] w-4 h-4 flex items-center justify-center text-[12px] rounded-[3px] p-[1]' key={index} style={{ color: "#adadcb" }}>{Icon}</div>
          ))}
        </div>
      </div>
      <div className='flex flex-col gap-4'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div className='bg-[#353559] h-16 rounded-lg border-l-[10px]' key={index}>
            Work Chats
          </div>
        ))}
      </div>
    </div>
  );
};

export default SideMenu;