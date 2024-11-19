"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import configuration from "@/configuration";
import {
  Check,
  ChevronRight,
  Pencil,
  Ruler,
  ShoppingBasket,
  SquareMousePointer,
} from "lucide-react";

const page = () => {
  return (
    <div className="flex flex-col items-stretch w-full overflow-hidden">
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
                  <ShoppingBasket className="w-4 h-4 mt-px" /> Add to cart
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {/* <Accordion type="single" collapsible>
        <AccordionItem value="select" disabled></AccordionItem>
        <AccordionItem disabled value="select">
          <AccordionTrigger>Selected: V8</AccordionTrigger>
          <AccordionContent>
            Yes. It adheres to the WAI-ARIA design pattern.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Is it accessible?</AccordionTrigger>
          <AccordionContent>
            Yes. It adheres to the WAI-ARIA design pattern.
          </AccordionContent>
        </AccordionItem>
      </Accordion> */}
    </div>
  );
};

export default page;
