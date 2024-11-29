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

  if (isComplete) console.log({ step, activeStep });
  if (isComplete)
    return (
      <BreadcrumbItem onClick={onClick}>
        <BreadcrumbLink
          href={href}
          className="text-base text-green-900 cursor-pointer font-medium"
        >
          <div className="flex items-center gap-2 rounded bg-green-500/5 px-1.5 pb-px">
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
        <BreadcrumbLink className="font-bold text-base text-black">
          <div className="flex items-center gap-1.5 rounded-lg pl-1.5 pr-2 pb-px font-medium border border-green-900/50">
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
    <div className="flex flex-col items-stretch w-full overflow-hidden flex-grow space-y-3">
      <div className="w-full flex items-center flex-gow justify-center relative ">
        <div className="max-w-4xl w-full flex px-4">
          <div className="py-2.5 px-4 xl:rounded-bl-lg rounded-br-lg  bg-amber-700/[2%] border-b border-r border-amber-950/10">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItemComponent
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
        </div>
      </div>

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
