"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import configuration from "@/configuration";
import { cn } from "@/lib/utils";
import { AddToCartStep } from "@/types/ui.types";
import {
  Check,
  ChevronRight,
  Pencil,
  Ruler,
  ShoppingBasket,
  SquareMousePointer,
} from "lucide-react";
import { useState } from "react";

const { Customise, Personalise, AddToCart } = AddToCartStep;

const Page = () => {
  const [activeStep, setActiveStep] = useState(Customise);
  return (
    <div className="flex flex-col items-stretch w-full overflow-hidden flex-grow">
      <div className="hover:bg-gray-200 w-full flex items-center group px-4 py-2 space-x-2 bg-gradient-to-l from-white to-gray-50">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href={configuration.paths.appHome}
                className="text-green-900"
              >
                <div className="flex items-center gap-2 rounded bg-green-500/5 px-1.5 pb-px">
                  <SquareMousePointer className="w-4 h-4 mt-px" />
                  <span className="text-black">Select</span>
                  <Check className="w-4 h-4 mt-px" />
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <ChevronRight className="w-5 mt-px" />
            <BreadcrumbItem className="relative">
              <div className="absolute bottom-0 left-0 right-0 border-b border-gray-400 transform translate-y-1"></div>
              <BreadcrumbLink className="text-black cursor-default">
                <div className="flex items-center gap-1.5 rounded pl-1 pr-2 pb-px">
                  <Ruler className="w-4 h-4 mt-px" /> Customise
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <ChevronRight className="w-5 mt-px" />
            <BreadcrumbItem>
              <BreadcrumbLink>
                <div className="flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 mt-px" /> Personalise
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <ChevronRight className="w-5 mt-px" />
            <BreadcrumbItem>
              <BreadcrumbLink>
                <div className="flex items-center gap-1.5">
                  <ShoppingBasket className="w-5 h-5 -mt-px" /> Add to cart
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {[Customise, Personalise, AddToCart].map(step => (
        <div
          key={step}
          onClick={() => setActiveStep(step)}
          className={cn(
            "transition-all ease duration-1000 relative overflow-hidden",
            step === activeStep ? "flex-grow min-h-[2.5rem]" : "h-10",
          )}
        >
          <div className={cn("absolute inset-0")}>
            <div className="p-4 h-full">
              <div className="sticky top-0 flex flex-col">
                <h2 className="text-lg font-semibold">{step} Section</h2>
                <p className="mt-2">
                  This is the content for the {step} section. It expands to fill
                  the available space and scrolls if the content overflows.
                </p>
                <div className="mt-4 space-y-2">
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Vivamus lacinia odio vitae vestibulum vestibulum.
                  </p>
                  <p>
                    Cras venenatis euismod malesuada. Nullam ac urna eu felis
                    dapibus condimentum sit amet a augue.
                  </p>
                  <p>
                    Donec sodales, nisi id mattis convallis, sem velit facilisis
                    ipsum, eget mollis orci odio id libero.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Page;
