"use client";

import Image from "next/image";
import bgImage from "../../public/images/hero/hero-bg-image.jpg";
import circleImage from "../../public/images/hero/bg-circle.png";
import SearchBar from "../searchbar";
import aaron from "@/public/images/promo/Aaron_Sept_20_19.jpg";
import arrow from "@/public/images/hero/Vector.png";

const Page = () => {
  return (
    <>
      <section
        className="relative h-full flex items-center justify-center"
        style={{ boxShadow: "inset 0 0 0 3000px rgb(0, 0, 0,0.7)" }}
      >
        <div className="absolute inset-0 -z-10">
          <Image
            src={bgImage}
            alt="Hero Background"
            fill
            className="object-cover"
          />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2 text-left text-white space-y-6">
            <div className="max-w-[520px]">
              <h1 className="text-[24px] md:text-[60px] font-bold">
                Lorem Ipsum is simply dummy text of the
              </h1>
              <p className="text-sm md:text-[20px] mt-2">
                Carefully crafted after analyzing the needs of different
                industries and the design.
              </p>
              <button className="bg-customwhite-primary hover:bg-customwhite-primary text-customgreen-primary text-[14px] px-6 py-3 mt-8 rounded-full">
                Get Started
              </button>
            </div>
          </div>

          <div className="w-full rounded-full md:w-1/2 relative flex justify-center mt-8 md:mt-0">
            <div className="relative">
              <Image
                src={aaron}
                alt="Hero"
                width={300}
                height={300}
                className="rounded-full border-[4px] w-[200px] sm:w-full border-white"
              />

              <div className="absolute top-[90px] md:top-5 -right-10">
                <Annotation
                  label="Select"
                  description="Pick your desire item"
                />
                <Image
                  src={arrow}
                  alt="Arrow"
                  height={30}
                  width={30}
                  className="absolute right-[13.9rem] sm:right-[21.8rem] md:right-[21.3rem] top-0 sm:top-[3rem] md:top-[5rem]"
                />
              </div>

              <div className="absolute top-5 -left-10">
                <Annotation
                  label="Customise"
                  description="Adjust to your preferences"
                />
              </div>
              <div className="absolute bottom-0 -right-1 transform translate-y-6">
                <Annotation
                  label="Add to cart"
                  description="Ready for checkout"
                />
              </div>
            </div>
          </div>
        </div>
        <SearchBar />
      </section>
    </>
  );
};

const Annotation = ({
  label,
  description,
}: {
  label: string;
  description: string;
}) => (
  <div className="bg-white text-gray-700 shadow-lg rounded-lg p-3 text-sm space-y-1">
    <span className="block font-bold text-green-500">{label}</span>
    <span>{description}</span>
  </div>
);

export default Page;
