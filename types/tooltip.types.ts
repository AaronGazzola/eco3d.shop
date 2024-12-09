import { StaticImageData } from "next/image";

interface TooltipProps {
    text: string;
    imageSrc: string | StaticImageData;
    alt: string;
  }

export default TooltipProps;
