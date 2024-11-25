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
} from "lucide-react";
import { useState } from "react";

const { Customise, Personalise, AddToCart, Select } = AddToCartStep;

const BreadcrumbItemComponent = ({
  href,
  activeStep,
  step,
  onClick,
}: {
  href?: string;
  isComplete?: boolean;
  step: AddToCartStep;
  onClick?: () => void;
  activeStep: AddToCartStep;
}) => {
  const isComplete =
    step === Select ||
    (step === Customise && activeStep !== Customise) ||
    (step === Personalise &&
      activeStep !== Personalise &&
      activeStep !== Customise);

  const isActive = step === activeStep;
  const isDisabled = step !== activeStep && !isComplete;
  const icon =
    step === Customise ? (
      <Ruler className="w-4 h-4 mt-px" />
    ) : step === Personalise ? (
      <Pencil className="w-4 h-4 mt-px" />
    ) : step === AddToCart ? (
      <ShoppingBasket className="w-5 h-5 -mt-px" />
    ) : null;
  if (isComplete) console.log({ step, activeStep });
  if (isComplete)
    return (
      <BreadcrumbItem onClick={onClick}>
        <BreadcrumbLink
          href={href}
          className="text-base text-green-900 cursor-pointer font-medium"
        >
          <div className="flex items-center gap-2 rounded bg-green-500/5 px-1.5 pb-px">
            <Check className="w-4 h-4 mt-px" />
            <span>{step}</span>
          </div>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
  if (isActive)
    return (
      <BreadcrumbItem className="cursor-default" onClick={onClick}>
        {/* <div className="absolute bottom-0 left-0 right-0 border-b border-green-800/80 transform translate-y-1"></div> */}
        <BreadcrumbLink className="font-bold text-base text-black">
          <div className="flex items-center gap-1.5 rounded-lg pl-1.5 pr-2 pb-px font-medium border border-green-900/50">
            {icon} {step}
          </div>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
  if (isDisabled)
    return (
      <BreadcrumbItem>
        <BreadcrumbLink className="text-medium text-gray-500 text-base hover:text-gray-500 cursor-not-allowed">
          <div className="flex items-center gap-1.5">
            {icon} {step}
          </div>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
  return null;
};

const Page = () => {
  const [activeStep, setActiveStep] = useState(Customise);
  return (
    <div className="flex flex-col items-stretch w-full overflow-hidden flex-grow">
      <div className="w-full flex items-center group px-4 py-2 space-x-2 shadow">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItemComponent
              isComplete
              href={configuration.paths.appHome}
              step={Select}
              activeStep={activeStep}
            />

            <ChevronRight className="w-5 mt-px" />
            <BreadcrumbItemComponent
              activeStep={activeStep}
              step={Customise}
              onClick={() => setActiveStep(Customise)}
            />
            <ChevronRight className="w-5 mt-px" />

            <BreadcrumbItemComponent
              activeStep={activeStep}
              step={Personalise}
              onClick={() => setActiveStep(Personalise)}
            />
            <ChevronRight className="w-5 mt-px" />

            <BreadcrumbItemComponent
              activeStep={activeStep}
              step={AddToCart}
              onClick={() => setActiveStep(AddToCart)}
            />
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {[Customise, Personalise, AddToCart].map(step => {
        const isCustomise = step === Customise;
        const isPersonalise = step === Personalise;
        const isAddToCart = step === AddToCart;
        const isActive = step === activeStep;
        const icon =
          step === Customise ? (
            <Ruler className="w-8 h-8 mt-px" />
          ) : step === Personalise ? (
            <Pencil className="w-8 h-8 mt-px" />
          ) : step === AddToCart ? (
            <ShoppingBasket className="w-10 h-10 -mt-px" />
          ) : null;
        return (
          <div
            key={step}
            onClick={() => setActiveStep(step)}
            className={cn(
              "transition-all ease-out duration-500 relative overflow-hidden cursor-pointer",
              isActive ? "flex-grow min-h-[92px]" : "h-[92px]",
            )}
          >
            <div className={cn("absolute inset-0")}>
              <div
                className={cn(
                  "flex-grow p-4 flex items-center gap-4 text-gray-800",
                  isActive && "text-green-800",
                )}
              >
                {icon}
                <h1 className="text-[2.5rem] font-semibold ">{step}</h1>
              </div>
              <div className="pb-4">
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
        );
      })}
    </div>
  );
};

export default Page;
