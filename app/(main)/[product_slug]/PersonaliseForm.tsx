"use client";

import Tooltip from "@/components/products/Tooltip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Img from "@/public/images/products/Digger/Aaron Set 2-10.jpg";
import Image from "next/image";

const PersonaliseForm = ({ isAnimating }: { isAnimating: boolean }) => {
  return (
    <div
      className={cn(
        "bg-gray-50 p-4",
        isAnimating ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      <div className="mx-auto bg-white p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Left: Inputs */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 xs:gap-10">
              <Input
                type="text"
                maxLength={10}
                pattern=".{10}"
                placeholder="Example 1"
                className="w-full px-4 py-2 border h-14 rounded-none shadow-sm text-[#757575] placeholder:text-gray-400"
              />
              <Input
                type="text"
                maxLength={10}
                pattern=".{10}"
                placeholder="Example 2"
                className="w-full px-4 py-2 h-14 border rounded-none shadow-sm text-[#757575] placeholder:text-gray-400"
              />
              <Input
                type="text"
                maxLength={10}
                pattern=".{10}"
                placeholder="Example 3"
                className="w-full px-4 py-2 h-14 border rounded-none shadow-sm text-[#757575] placeholder:text-gray-400"
              />

              <Input
                type="text"
                maxLength={10}
                pattern=".{10}"
                placeholder="Example 4"
                className="w-full px-4 py-2 h-14 mt-16 border rounded-none shadow-sm text-[#757575] placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Right: Examples */}
          <div className="space-y-4">
            <div className="relative border-gray-300 text-center flex flex-col gap-[1.4rem] rounded-sm border">
              <p className="font-dancing_script xs:text-[50px] xs:leading-[4.25rem] text-3xl text-black">
                ShahidDev1
              </p>
              <p className="font-dancing_script xs:text-[50px] xs:leading-[4.25rem] text-3xl text-black">
                ShahidDev1
              </p>
              <p className="font-dancing_script xs:text-[50px] xs:leading-[4.25rem] text-3xl text-black">
                ShahidDev1
              </p>

              <Image
                src={Img}
                width={10}
                height={10}
                alt="Top-right"
                unoptimized={true}
                className="absolute -top-[2.45rem] -right-9 h-12 w-12 object-cover rounded-md cursor-pointer peer z-20"
              />

              <Tooltip imageSrc={Img} text="This is tooltip" alt="Toop Tip" />
            </div>

            <div className="space relative">
              <div className="flex items-center justify-center mt-[6.1rem] relative p-[0.7rem] rounded-sm border">
                <p className="font-futura xs:text-[50px] text-3xl font-bold text-black">
                  ShahidDev 1
                </p>
                <Image
                  src="/images/products/Digger/Aaron Set 2-10.jpg"
                  alt="Bottom-right"
                  unoptimized={true}
                  width={10}
                  height={10}
                  className="absolute bottom-[2.9rem] -right-9 h-12 w-12 object-cover rounded-md cursor-pointer peer"
                />
                <Tooltip imageSrc={Img} text="This is tooltip" alt="Toop Tip" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaliseForm;
