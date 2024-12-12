"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Image from "next/image";

const PersonaliseForm = ({ isAnimating }: { isAnimating: boolean }) => {
  return (
    <div
      className={cn(
        "w-full h-full",
        isAnimating ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      <div className="w-full hidden lg:flex justify-center flex-row">
        <div className="aspect-square w-full max-w-[450px] md:max-w-[400px] flex-shrink-0 flex flex-col ">
          <div className="w-full h-[66%] p-2">
            <Textarea className="h-full" />
          </div>
          <div className="w-full h-[33%] p-2">
            <Input className="h-full" />
          </div>
        </div>
        <div className="aspect-square w-full max-w-[450px] md:max-w-[400px] flex-shrink-0 flex flex-col">
          <div className="w-full h-[66%] p-2">
            <Card className="h-full w-full relative">
              <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                <div className="relative w-full aspect-square scale-125">
                  <Image
                    src="/images/products/V8/details/Aaron set 3-29.jpg"
                    alt="Product preview with primary message"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </Card>
          </div>
          <div className="w-full h-[33%] p-2">
            <Card className="h-full w-full relative">
              <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                <div className="relative w-full aspect-square scale-[130%]  translate-y-9">
                  <Image
                    src="/images/products/V8/details/Aaron set 3-30.jpg"
                    alt="Product preview with secondary message"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col items-center">
        <div className="h-full w-full flex flex-col items-center lg:hidden max-w-[500]">
          <div className="w-full h-[248px] p-2">
            <Textarea className="h-full" />
          </div>
          <div className="w-full h-[248px] p-2">
            <Card className="h-full w-full relative">
              <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                <div className="relative w-full aspect-square ">
                  <Image
                    src="/images/products/V8/details/Aaron set 3-29.jpg"
                    alt="Product preview with primary message"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </Card>
          </div>
          <div className="w-full h-[116px] p-2">
            <Input className="h-full" />
          </div>
          <div className="w-full h-[116px] p-2">
            <Card className="h-full w-full relative">
              <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                <div className="relative w-full aspect-square translate-y-9 scale-125 xs:scale-110">
                  <Image
                    src="/images/products/V8/details/Aaron set 3-30.jpg"
                    alt="Product preview with secondary message"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaliseForm;
