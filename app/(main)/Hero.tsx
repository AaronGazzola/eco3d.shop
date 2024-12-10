"use client";

import SearchBar from "@/components/searchbar";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Ruler,
  ShoppingBasket,
  SquareMousePointer,
} from "lucide-react";

import TShape1 from "@/assets/svg/icons/hero-t-shape-1.svg";
import TShape2 from "@/assets/svg/icons/hero-t-shape-2.svg";
import HeroImage from "@/assets/svg/icons/right-hero-img.svg";
import SendArrow from "@/assets/svg/icons/send-arrow.svg";

type AnnotationProps = {
  icon: React.ReactNode;
  label: string;
  description: string;
};

const Annotation = ({ icon, label, description }: AnnotationProps) => (
  <div className="pt-2.5 pb-3 px-4 rounded-lg bg-white text-gray-900 shadow-lg text-sm space-y-1 flex flex-col gap-0.5">
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-semibold text-sm text-nowrap text-gray-900">
        {label}
      </span>
    </div>
    <span className="text-nowrap text-gray-700">{description}</span>
  </div>
);

const Hero = () => {
  return (
    <section className="relative flex items-center justify-center shadow-[inset_0_0_0_3000px_rgb(0,0,0,0.7)]">
      <div className="absolute inset-0 -z-10">
        {/* <Image
          src={HeroBg}
          alt="Hero Background"
          className="object-cover"
          fill
        /> */}
      </div>

      <div className="flex flex-col md:flex-row items-center">
        <div className="w-full md:w-1/2 text-left text-white space-y-6">
          <div className="max-w-[520px]">
            <h1 className="font-semibold text-4xl sm:text-4xl md:text-6xl sm:leading-[70px]">
              Lorem Ipsum is simply dummy text of the
            </h1>
            <p className="font-medium text-lg sm:text-xl leading-[28px] mt-2">
              Carefully crafted after analyzing the needs of different
              industries and the design.
            </p>
            <Button className="font-semibold bg-primary hover:bg-white text-white text-base leading-[19.2px] px-6 py-3 mt-8 rounded-full">
              Get Started
            </Button>
          </div>
        </div>

        <div className="w-full rounded-full md:w-1/2 relative flex justify-center">
          <TShape1 className="h-full md:w-full absolute md:-top-6 md:-right-14" />
          <TShape2 className="h-full md:w-full absolute md:top-2 md:-left-10" />
          <div className="relative md:w-[440px]">
            <HeroImage className="rounded-full border-[4px] h-full md:w-full border-white" />

            <div className="absolute top-20 right-0 sm:-right-[36px] md:-right-[75px]">
              <Annotation
                icon={<ShoppingBasket width={20} height={20} />}
                label="Add to cart"
                description="Ready for checkout"
              />
            </div>

            <div className="absolute top-6 left-0 md:-left-10">
              <Annotation
                icon={<SquareMousePointer width={20} height={20} />}
                label="Select"
                description="Pick your desire item"
              />
            </div>

            <div className="absolute bottom-5 -right-1 transform translate-y-6">
              <Annotation
                icon={<Pencil width={20} height={20} />}
                label="Personalise"
                description="Make it uniquely yours"
              />
            </div>

            <div className="absolute top-40 sm:top-56 sm:-left-[45px] md:top-72 left-0 md:-left-[55px] transform translate-y-6">
              <Annotation
                icon={<Ruler width={20} height={20} />}
                label="Customize"
                description="Adjust to your preferences"
              />
            </div>

            <div className="absolute w-12 h-12 -rotate-[88.5deg] right-2/4 -bottom-[21px]">
              <SendArrow className="w-full h-full" />
            </div>
            <div className="absolute w-12 h-12 -rotate-[185.5deg] -right-[18px] bottom-[35%]">
              <SendArrow className="w-full h-full" />
            </div>
            <div className="absolute w-12 h-12 -left-[18px] top-[35%]">
              <SendArrow className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
      <SearchBar />
    </section>
  );
};

export default Hero;
