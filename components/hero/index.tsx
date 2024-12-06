"use client";

import Image from "next/image";
import bgImage from "../../public/images/hero/hero-bg-image.jpg";
import SearchBar from "../searchbar";
import {
  SquareMousePointer,
  ShoppingBasket,
  Pencil,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { comfortaa } from "@/styles/fonts";
import { Button } from "../ui/button";

const Annotation = ({ icon, label, description, position }: any) => (
  <div className={`bg-white text-gray-700 md:w-[136px] shadow-lg rounded-[7px] py-[8px] px-[10px] text-sm space-y-1`}>
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-semibold text-sm text-nowrap text-[#37363B]">
        {label}
      </span>
    </div>
    <span className="text-[9.76px] text-nowrap text-gray-500">
      {description}
    </span>
  </div>
);

const Page = () => {
  return (
    <section
      className="relative h-[656px] flex items-center justify-center"
      style={{ boxShadow: "inset 0 0 0 3000px rgb(0, 0, 0,0.7)" }}
    >
      <div className={cn("absolute inset-0 -z-10", comfortaa.className)}>
        <Image
          src={bgImage}
          alt="Hero Background"
          className="object-cover"
          fill
        />
      </div>

      <div className="container mx-auto px-14 relative z-10 flex flex-col md:flex-row items-center m-0">
        <div className="w-full md:w-1/2 text-left text-white space-y-6">
          <div className="max-w-[520px]">
            <h1 className={cn("font-semibold text-4xl sm:text-4xl md:text-6xl sm:leading-[70px]", comfortaa.className)}>
              Lorem Ipsum is simply dummy text of the
            </h1>
            <p className={cn("font-medium text-lg sm:text-xl leading-[28px] mt-2", comfortaa.className)}>
              Carefully crafted after analyzing the needs of different
              industries and the design.
            </p>
            <Button className={cn("font-semibold bg-primary hover:bg-white text-white text-base leading-[19.2px] px-6 py-3 mt-8 rounded-full", comfortaa.className)}>
              Get Started
            </Button>
          </div>
        </div>

        <div className="w-full rounded-full md:w-1/2 relative flex justify-center mt-8 md:mt-0 xs:mb-24">
          <Image
            src="/images/hero/hero-t-shape-1.svg"
            alt="Hero"
            width={300}
            height={300}
            className="h-full md:w-full absolute md:-top-6 md:-right-14"
          />
          <Image
            src="/images/hero/hero-t-shape-2.svg"
            alt="Hero"
            width={300}
            height={300}
            className="h-full md:w-full absolute md:top-2 md:-left-10"
          />
          <div className="relative md:w-[440px]">
            <Image
              src="/images/hero/right-hero-img.svg"
              alt="Hero"
              width={300}
              height={300}
              className="rounded-full border-[4px] h-full md:w-full border-white"
            />

            {/* Boxes */}
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

            {/* arrows */}
            <div className="absolute w-12 h-12 -rotate-[88.5deg] right-2/4 -bottom-[21px]">
              <Image
                src="/images/hero/send-arrow.svg"
                width={30}
                height={33}
                alt="arrow-icon"
  
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <div className="absolute w-12 h-12 -rotate-[185.5deg] -right-[18px] bottom-[35%]">
              <Image
                src="/images/hero/send-arrow.svg"
                width={30}
                height={33}
  
                alt="arrow-icon"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <div className="absolute w-12 h-12 -left-[18px] top-[35%]">
              <Image
                src="/images/hero/send-arrow.svg"
                width={30}
                height={33}
  
                alt="arrow-icon"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>
      <SearchBar />
    </section>
  );
};

export default Page;
