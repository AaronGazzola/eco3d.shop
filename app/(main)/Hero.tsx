"use client";

import TShape1 from "@/assets/svg/icons/hero-t-shape-1.svg";
import TShape2 from "@/assets/svg/icons/hero-t-shape-2.svg";
import SendArrow from "@/assets/svg/icons/send-arrow.svg";
import SearchBar from "@/components/searchbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Ruler,
  ShoppingBasket,
  SquareMousePointer,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

enum CircleSide {
  Top,
  Right,
  Bottom,
  Left,
}

const { Top, Right, Bottom, Left } = CircleSide;

const Annotation = ({
  className,
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  className?: string;
}) => (
  <div className={className}>
    <div className="pt-2.5 pb-3 px-4 rounded-lg bg-white text-gray-900 shadow-lg text-sm space-y-1 flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm text-nowrap text-gray-900">
          {label}
        </span>
      </div>
      <span className="text-nowrap text-gray-700">{description}</span>
    </div>
  </div>
);

const Hero = () => {
  const [circleSideAtTop, setCircleSideAtTop] = useState<CircleSide>(Top);
  const [rotation, setRotation] = useState(0);
  const handleRotation = () => {
    setRotation(prev => prev - 90);
    setCircleSideAtTop(prev =>
      prev === Top
        ? Right
        : prev === Right
          ? Bottom
          : prev === Bottom
            ? Left
            : Top,
    );
  };

  return (
    <section className="relative flex items-center justify-center shadow-[inset_0_0_0_3000px_rgb(0,0,0,0.6)] pt-10 pb-20">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/promo/Aaron_Sept_20_19.jpg"
          alt="Hero Background"
          className="object-cover"
          fill
        />
      </div>

      <div className="flex flex-col md:flex-row items-stretch">
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

        <div
          className="w-full md:w-1/2 relative flex cursor-pointer"
          onClick={handleRotation}
        >
          <div className="aspect-square">
            <TShape1 className="h-full md:w-full absolute md:-top-6 md:-right-14" />
            <TShape2 className="h-full md:w-full absolute md:top-2 md:-left-10" />
            <div className="relative md:w-[440px] h-full">
              <div className="rounded-full border-[4px] border-white overflow-hidden relative h-full md:w-full">
                <div className="absolute inset-0">
                  <Image
                    src="/images/products/V8/details/Aaron set 3-29.jpg"
                    alt="Hero Background"
                    className="object-cover"
                    fill
                  />
                </div>
                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_60px_25px_rgba(0,0,0,0.6)]" />
              </div>

              <div className="absolute top-20 right-0 sm:-right-[36px] md:-right-[75px]">
                <Annotation
                  icon={<ShoppingBasket width={20} height={20} />}
                  label="Add to cart"
                  description="Ready for checkout"
                />
              </div>

              <Annotation
                className="absolute top-6 left-0 md:-left-10"
                icon={<SquareMousePointer width={20} height={20} />}
                label="Select"
                description="Pick your desire item"
              />

              <Annotation
                className="absolute bottom-5 -right-1 transform translate-y-6"
                icon={<Pencil width={20} height={20} />}
                label="Personalise"
                description="Make it uniquely yours"
              />

              <Annotation
                className="absolute top-40 sm:top-56 sm:-left-[45px] md:top-72 left-0 md:-left-[55px] transform translate-y-6"
                icon={<Ruler width={20} height={20} />}
                label="Customize"
                description="Adjust to your preferences"
              />
              <div
                className="absolute inset-0 transition-transform duration-1000 ease-in-out"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <SendArrow
                  className={cn(
                    "absolute left-1/2 -translate-y-1/2 -translate-x-1/2 top-0 rotate-[-291deg] transition-opacity ease-in",
                    circleSideAtTop === Top ? "opacity-0" : "delay-300",
                  )}
                />
                <SendArrow
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 translate-x-1/2 right-0 rotate-[-201deg] transition-opacity ease-in",
                    circleSideAtTop === Right ? "opacity-0" : "delay-300",
                  )}
                />
                <SendArrow
                  className={cn(
                    "absolute left-1/2 translate-y-1/2 -translate-x-1/2 bottom-0 rotate-[-111deg] transition-opacity ease-in",
                    circleSideAtTop === Bottom ? "opacity-0" : "delay-300",
                  )}
                />
                <SendArrow
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-0 rotate-[-21deg] transition-opacity ease-in",
                    circleSideAtTop === Left ? "opacity-0" : "delay-300",
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <SearchBar />
    </section>
  );
};

export default Hero;
