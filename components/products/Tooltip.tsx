import React from "react";
import Image from "next/image";


import TooltipProps from "@/types/tooltip.types";

const Tooltip = ({ text, imageSrc, alt }: TooltipProps) => {

  return (
    <div
      className="absolute bottom-1 left-24 sm:left-0 transform -translate-x-1/2 mt-2 w-64 p-4 
              bg-white border border-gray-300 shadow-lg rounded-lg opacity-0 pointer-events-none
              transition-opacity duration-300 peer-hover:opacity-100 peer-hover:pointer-events-auto"
    >
      <Image
        src={imageSrc}
        alt={alt}
        width={64}
        height={64}
        className="w-full rounded"
      />
      <p className="text-center mt-1">{text}</p>
      
    </div>
  );
};

export default Tooltip;
