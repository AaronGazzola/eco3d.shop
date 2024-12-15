"use client";

import { AddToCartSummary } from "@/app/(main)/[product_slug]/AddToCartSummary";
import CompressedCustomiseForm from "@/app/(main)/[product_slug]/CompressedCustomiseForm";
import { CustomiseForm } from "@/app/(main)/[product_slug]/CustomiseForm";
import PersonaliseForm from "@/app/(main)/[product_slug]/PersonaliseForm";
import { Button } from "@/components/ui/button";
import { camelCaseToFormattedString } from "@/lib/string.util";
import { cn } from "@/lib/utils";
import { ImageSize, ProductStepProps } from "@/types/product.types";
import { AddToCartStep } from "@/types/ui.types";
import { ChevronDown, Pencil, Ruler, ShoppingBasket } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";

const { Customise, Personalise, AddToCart, Select } = AddToCartStep;

export const COLLAPSED_PRODUCT_STEP_HEIGHT = 65;
export const EXPANDED_HEADER_HEIGHT = 92;

const ProductPageStep = ({
  step,
  activeStep,
  onChangeActiveStep,
  isDisabled: isDisabledProp = false,
}: ProductStepProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isCustomeiseStep = step === Customise;
  const isPersonaliseStep = step === Personalise;
  const isAddToCartStep = step === AddToCart;
  const isSelectStep = step === Select;
  const isActive = step === activeStep;
  const isNext =
    (step === Personalise && activeStep === Customise) ||
    (step === AddToCart && activeStep === Personalise);
  const isDisabled =
    isDisabledProp || (step === AddToCart && activeStep === Customise);
  const isComplete =
    (isPersonaliseStep && activeStep === AddToCart) ||
    (isCustomeiseStep && activeStep !== Customise);

  const [size, setSize] = useQueryState("size", {
    defaultValue: "Small",
    parse: (value: string | null): ImageSize =>
      ["Small", "Medium", "Large"].includes(value || "")
        ? (value as ImageSize)
        : "Small",
  });

  const [colors, setColors] = useQueryState("colors", {
    defaultValue: '["Natural","Black"]',
    parse: (value: string | null) => {
      try {
        const parsed = JSON.parse(value || '["Natural","Black"]');
        return Array.isArray(parsed)
          ? JSON.stringify(parsed)
          : '["Natural","Black"]';
      } catch {
        return '["Natural","Black"]';
      }
    },
  });

  const parsedColors = JSON.parse(colors);

  const fontColorClass = isActive ? "text-green-800" : "text-gray-700";

  const icon =
    step === Customise ? (
      <Ruler className={cn("xs:w-7 xs:h-7 w-5 h-5 mt-px", fontColorClass)} />
    ) : step === Personalise ? (
      <Pencil className={cn("xs:w-7 xs:h-7 w-5 h-5 mt-px", fontColorClass)} />
    ) : step === AddToCart ? (
      <ShoppingBasket
        className={cn("w-7 h-7 xs:w-9 xs:h-9 -mt-px", fontColorClass)}
      />
    ) : null;

  const isAtTop = isComplete || isActive;

  const bottomHeight = isPersonaliseStep
    ? COLLAPSED_PRODUCT_STEP_HEIGHT * 2 + 8
    : isAddToCartStep
      ? COLLAPSED_PRODUCT_STEP_HEIGHT + 8
      : 0;
  const top = isAtTop
    ? `${
        isPersonaliseStep
          ? COLLAPSED_PRODUCT_STEP_HEIGHT
          : isAddToCartStep
            ? COLLAPSED_PRODUCT_STEP_HEIGHT * 2
            : 0
      }px`
    : `calc(100% - ${bottomHeight}px)`;

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 600);
    return () => clearTimeout(timer);
  }, [activeStep]);

  const handleFormElementClick = (e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLButtonElement ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      e.stopPropagation();
    }
  };

  return (
    <div
      onClick={() =>
        !isDisabled && !isAddToCartStep && onChangeActiveStep(step)
      }
      className={cn(
        "absolute inset-0 flex flex-col items-center",
        isPersonaliseStep && "z-10",
        isAddToCartStep && "z-20",
        isCustomeiseStep && !isActive && "cursor-pointer",
      )}
      style={{
        top,
        transition: "top 0.6s ease-in-out",
      }}
    >
      {isAddToCartStep ? (
        <AddToCartSummary isNext={isNext} />
      ) : (
        <div
          className={cn(
            "max-w-4xl w-full xs:w-[calc(100%-16px)] flex-grow rounded-t-xl overflow-hidden shadow-xl transition-colors ease duration-250  border border-gray-300 group bg-white",
            isNext
              ? "shadow-[0_-5px_15px_2px_rgba(22,101,52,0.2)]"
              : "xs:border-gray-300",
          )}
        >
          <div className={cn("flex-grow relative h-full")}>
            <div
              className={cn(
                "absolute inset-0 flex flex-col gap-4 transition-all  pb-0 pt-3",
                isActive && "text-green-800",
              )}
              style={{
                bottom: isCustomeiseStep
                  ? 2 * COLLAPSED_PRODUCT_STEP_HEIGHT
                  : isPersonaliseStep
                    ? COLLAPSED_PRODUCT_STEP_HEIGHT
                    : 0,
              }}
            >
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-4 w-full justify-between">
                  <div className="flex gap-3 xs:gap-4 items-center xs:pl-4">
                    {icon}
                    <h1
                      className={cn(
                        "text-xl xs:text-[2rem] font-semibold",
                        fontColorClass,
                      )}
                    >
                      {camelCaseToFormattedString(step)}
                    </h1>
                  </div>
                </div>
                <div className="flex gap-4 relative flex-grow min-w-[50%] pl-6">
                  {isCustomeiseStep && activeStep === Personalise && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div onClick={handleFormElementClick} className="">
                        <CompressedCustomiseForm />
                      </div>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="default"
                    className={cn(
                      (isAtTop || !isPersonaliseStep) &&
                        "opacity-0 pointer-events-none cursor-default",
                      "transition-opacity w-full font-bold text-xl flex items-center gap-1 xs:gap-4 xs:hidden relative justify-center",
                    )}
                  >
                    <>
                      <span className="mb-[3px]">Next</span>
                      <ChevronDown className="absolute right-5 w-5 h-5 stroke-[3px]" />
                    </>
                  </Button>
                  <Button
                    variant="default"
                    className={cn(
                      (isAtTop || !isPersonaliseStep) &&
                        "opacity-0 pointer-events-none cursor-default",
                      "transition-opacity w-full font-bold text-xl items-center gap-1 justify-center xs:gap-10 hidden xs:flex relative",
                    )}
                  >
                    <>
                      <span className="mb-[3px]">Next</span>
                      <ChevronDown className="absolute right-5 w-5 h-5 stroke-[3px]" />
                    </>
                  </Button>
                </div>
              </div>
              {isCustomeiseStep ? (
                <CustomiseForm isAnimating={isTransitioning} />
              ) : isPersonaliseStep ? (
                <PersonaliseForm isAnimating={isTransitioning} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPageStep;
