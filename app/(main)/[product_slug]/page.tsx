"use client";

import ProductPageStep from "@/app/(main)/[product_slug]/ProductPageStep";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import configuration from "@/configuration";
import { AddToCartStep } from "@/types/ui.types";
import {
  Check,
  ChevronRight,
  Dot,
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
  const icon = (
    <div className="p-0.5">
      {step === Customise ? (
        <Ruler className="w-4 h-4 mt-px" />
      ) : step === Personalise ? (
        <Pencil className="w-4 h-4 mt-px" />
      ) : step === AddToCart ? (
        <ShoppingBasket className="w-5 h-5 -mt-px" />
      ) : null}
    </div>
  );

  if (isComplete)
    return (
      <BreadcrumbItem onClick={onClick}>
        <BreadcrumbLink
          href={href}
          className="text-base cursor-pointer font-medium"
        >
          <div className="flex items-center gap-2 rounded px-1.5 pb-px">
            <Check className="w-5 h-5 mt-px" />
            <span className="hidden sm:block">{step}</span>
          </div>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
  if (isActive)
    return (
      <BreadcrumbItem className="cursor-default" onClick={onClick}>
        {/* <div className="absolute bottom-0 left-0 right-0 border-b border-green-800/80 transform translate-y-1"></div> */}
        <BreadcrumbLink className="font-black text-base text-green-950">
          <div className="flex items-center gap-1.5 rounded-lg pl-1.5 pr-2 pb-px font-medium border border-primary">
            {icon} <span className="hidden xs:block">{step}</span>
          </div>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
  if (isDisabled)
    return (
      <BreadcrumbItem>
        <BreadcrumbLink className="text-medium text-gray-500 text-base hover:text-gray-500 cursor-not-allowed">
          <div className="flex items-center gap-1.5">
            {icon} <span className="hidden sm:block">{step}</span>
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
      <Breadcrumb className="w-full flex justify-center">
        <BreadcrumbList className="w-full flex justify-around max-w-3xl py-3 px-8">
          <BreadcrumbItemComponent
            href={configuration.paths.appHome}
            step={Select}
            activeStep={activeStep}
          />

          <Dot className="w-5 mt-px  sm:hidden" />
          <ChevronRight className="w-5 mt-px hidden sm:block" />
          <BreadcrumbItemComponent
            activeStep={activeStep}
            step={Customise}
            onClick={() => setActiveStep(Customise)}
          />

          <Dot className="w-5 mt-px  sm:hidden" />
          <ChevronRight className="w-5 mt-px hidden sm:block" />

          <BreadcrumbItemComponent
            activeStep={activeStep}
            step={Personalise}
            onClick={() => setActiveStep(Personalise)}
          />

          <Dot className="w-5 mt-px  sm:hidden" />
          <ChevronRight className="w-5 mt-px hidden sm:block" />

          <BreadcrumbItemComponent
            activeStep={activeStep}
            step={AddToCart}
            onClick={() => setActiveStep(AddToCart)}
          />
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-grow w-full relative">
        {[Customise, Personalise, AddToCart].map(step => (
          <ProductPageStep
            key={step}
            step={step}
            activeStep={activeStep}
            onChangeActiveStep={setActiveStep}
          />
        ))}
      </div>
    </div>
  );
};

export default Page;
