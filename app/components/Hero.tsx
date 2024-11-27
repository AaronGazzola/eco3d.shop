import { Icon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const config = {
  information: {
    title: "Lorem Ipsum is simply dummy text of the",
    description:
      "Carefully crafted after analyzing the needs of different industries and the design",
    start: "Get Started",
  },
};

export default function Hero() {
  return (
    <div className="w-full relative h-[800px] md:h-[656px] overflow-hidden">
      <Image
        src="/images/promo/hero-background.jpg"
        alt="Hero background"
        fill
        priority
        className="object-cover z-[-1]"
      />
      <div className="absolute inset-0 bg-[#0F3901] opacity-70 z-[-1]" />
      <div className="container w-[80%] px-2 h-full flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="text-white w-[45%]">
          <div className="text-[60px] leading-[72px] font-semibold">
            {config.information.title}
          </div>
          <div className="text-[20px] leading-[24px] font-medium">
            {config.information.description}
          </div>
          <Button className="mt-[32px]">{config.information.start}</Button>
        </div>
        <div className="w-[55%] h-full">{/* <Advertisement /> */}</div>
      </div>
    </div>
  );
}
