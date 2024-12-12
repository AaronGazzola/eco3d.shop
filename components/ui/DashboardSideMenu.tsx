import { Ellipsis } from "lucide-react";
import Image from "next/image";

interface sidebarMenuProps {
  text: string;
  heading: string;
  icons: JSX.Element[];
  isBorderRequired?: boolean;
  isMessageSection?: boolean;
  subTitle?: string;
}

const SideMenu = ({ text, heading, icons, isBorderRequired, isMessageSection, subTitle }: sidebarMenuProps) => {
  return (
    <div className='w-full flex flex-col gap-3'>
      <div className="flex justify-between items-center">
        <h3 className='text-lg '>{heading}</h3>
        <div className="flex justify-between items-center gap-2 cursor-pointer">
          {icons.map((Icon, index) => (
            <div className='bg-[#474770] w-4 h-4 flex items-center justify-center text-[12px] rounded-[3px] p-[1]' key={index} style={{ color: "#adadcb" }}>{Icon}</div>
          ))}
        </div>
      </div>
      <div className='flex flex-col gap-[10px]'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className={`bg-[#353559] ${isMessageSection ? '' : 'h-16'} rounded-lg flex justify-between items-center p-4`}
            style={{
              borderLeft: isBorderRequired ? '10px solid' : '',
              borderImage: isBorderRequired ? 'linear-gradient(176.8deg, #4277FF -8.62%, #C4F4FF 95.48%) 1' : '',
              clipPath: 'inset(0 round 10px)'
            }}
            key={index}
          >
            <div className="flex items-center gap-6">
              {
                isMessageSection ?
                  <Image src={'/svg/message-icon.svg'} alt={text} width={26} height={26} />
                  :
                  <Image src={'/svg/folder-icon.svg'} alt={text} width={28} height={28} />
              }
              <div>
                <h3 className="text-lg font-medium">{text}</h3>
                <p className="text-[12px] font-normal text-wrap text-[#898CAF]">{subTitle}</p>
              </div>
            </div>
            <div>
              <Ellipsis color="#8181A1" cursor={'pointer'} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SideMenu;