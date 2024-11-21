"use client";
import Image from "next/image";
import { cn } from "@/lib/utils";

const Hero = () => {
  return (
    <div className="relative w-full h-[90vh] overflow-hidden">
      {/* Background Image */}
      <Image
        src="/images/hero-bg.jpg"
        alt="Hero background"
        fill
        priority
        className="object-cover"
      />

      {/* Color Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(15, 57, 1, 0.7)" }}
      />

      {/* Content Container */}
      <div className="relative z-10 container mx-auto h-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 px-4">
        {/* Content will go here */}
      </div>
    </div>
  );
};

export default Hero;
