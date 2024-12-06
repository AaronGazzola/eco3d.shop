"use client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { comfortaa } from "@/styles/fonts";
import Image from "next/image";

const PersonaliseForm = () => {
  return (
    <div className="bg-gray-50 p-4 shadow-lg overflow-y-scroll">
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
            <div className="bg-[#fcf5f4] relative border-gray-300 text-center flex flex-col gap-[1.4rem]">
              <p className="font-dancing_script xs:text-[50px] xs:leading-[4.25rem] text-3xl">
                ShahidDev1
              </p>
              <p className="font-dancing_script xs:text-[50px] xs:leading-[4.25rem] text-3xl">
                ShahidDev1
              </p>
              <p className="font-dancing_script xs:text-[50px] xs:leading-[4.25rem] text-3xl">
                ShahidDev1
              </p>

              <Image
                src="/images/promo/Aaron_Sept_20_19.jpg"
                width={10}
                height={10}
                alt="Top-right"
                className="absolute -top-[2.45rem] -right-9 h-12 w-12 object-cover rounded-md cursor-pointer peer"
              />
              <div
                  className="absolute bottom-0 transform -translate-x-1/2 mt-2 w-64 p-4 
              bg-white border border-gray-300 shadow-lg rounded-lg opacity-0 pointer-events-none 
              transition-opacity duration-300 peer-hover:opacity-100 peer-hover:pointer-events-auto"
                >
                  <Image
                    src="/images/promo/Aaron_Sept_20_19.jpg"
                    alt="Larger Version"
                    width={64}
                    height={64}
                    className="w-full h-auto mb-2 rounded"
                  />
                  <p>This is tooltip</p>
                </div>
              
            </div>

            <div className="space relative">
              <div className="bg-[#fcf5f4] flex items-center justify-center mt-[6.5rem] relative p-[0.7rem]">
                <p className="font-futura xs:text-[50px] text-3xl font-bold">ShahidDev 1</p>
                <Image
                  src="/images/promo/Aaron_Sept_20_19.jpg"
                  alt="Bottom-right"
                  width={10}
                  height={10}
                  className="absolute bottom-[3.9rem] -right-9 h-12 w-12 object-cover rounded-md cursor-pointer peer"
                />
                <div
                  className="absolute bottom-24 transform -translate-x-1/2 mt-2 w-64 p-4 
              bg-white border border-gray-300 shadow-lg rounded-lg opacity-0 pointer-events-none 
              transition-opacity duration-300 peer-hover:opacity-100 peer-hover:pointer-events-auto"
                >
                  <Image
                    src="/images/promo/Aaron_Sept_20_19.jpg"
                    alt="Larger Version"
                    width={64}
                    height={64}
                    className="w-full h-auto mb-2 rounded"
                  />
                  <p>This is tooltip</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaliseForm;
