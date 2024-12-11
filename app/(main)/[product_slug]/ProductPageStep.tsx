import { AddToCartSummary } from "@/app/(main)/[product_slug]/AddToCartSummary";
import { CustomiseForm } from "@/app/(main)/[product_slug]/CustomiseForm";
import PersonaliseForm from "@/app/(main)/[product_slug]/PersonaliseForm";
import { Button } from "@/components/ui/button";
import { camelCaseToFormattedString } from "@/lib/string.util";
import { cn } from "@/lib/utils";
import { AddToCartStep } from "@/types/ui.types";
import { ChevronDown, Pencil, Ruler, ShoppingBasket } from "lucide-react";
import { useEffect, useState } from "react";

const { Customise, Personalise, AddToCart, Select } = AddToCartStep;

export const COLLAPSED_PRODUCT_STEP_HEIGHT = 75;
export const EXPANDED_HEADER_HEIGHT = 92;

const ProductPageStep = ({
  step,
  activeStep,
  onChangeActiveStep,
  isDisabled: isDisabledProp = false,
}: {
  step: AddToCartStep;
  activeStep: AddToCartStep;
  onChangeActiveStep: (step: AddToCartStep) => void;
  isDisabled?: boolean;
}) => {
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

  const fontColorClass = isActive ? "text-green-800" : "text-gray-700";

  const icon =
    step === Customise ? (
      <Ruler className={cn("w-7 h-7 mt-px", fontColorClass)} />
    ) : step === Personalise ? (
      <Pencil className={cn("w-7 h-7 mt-px", fontColorClass)} />
    ) : step === AddToCart ? (
      <ShoppingBasket className={cn("w-9 h-9 -mt-px", fontColorClass)} />
    ) : null;

  const isAtTop = isComplete || isActive;

  const bottomHeight = isPersonaliseStep
    ? COLLAPSED_PRODUCT_STEP_HEIGHT * 2
    : isAddToCartStep
      ? COLLAPSED_PRODUCT_STEP_HEIGHT
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

  return (
    <div
      onClick={() =>
        !isDisabled && !isAddToCartStep && onChangeActiveStep(step)
      }
      className={cn(
        "absolute inset-0 flex flex-col items-center",
        isPersonaliseStep && "z-10",
        isAddToCartStep && "z-20",
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
            `max-w-5xl w-full flex-grow rounded-t-xl overflow-hidden transition-colors ease duration-250 px-1 xs:px-4 group bg-white`,
            isNext && "shadow-[0_-5px_15px_2px_rgba(22,101,52,0.2)]",
            isPersonaliseStep ? "shadow-none" : "shadow-xl",
            isPersonaliseStep ? "border-0" : "border",
          )}
        >
          <div className={cn("flex-grow relative h-full")}>
            <div
              className={cn(
                "absolute inset-0 pr-10 flex flex-col gap-4 transition-all p-3 pb-0 pt-3",
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 w-full justify-between">
                  <div className="flex gap-4 items-center">
                    {icon}
                    <h1
                      className={cn(
                        "text-[2rem] font-semibold",
                        fontColorClass,
                      )}
                    >
                      {camelCaseToFormattedString(step)}
                    </h1>
                  </div>
                </div>
                <div className="flex gap-4 relative flex-grow min-w-[50%] px-4">
                  <Button
                    variant="default"
                    className={cn(
                      (isAtTop || !isPersonaliseStep) &&
                        "opacity-0 pointer-events-none cursor-default",
                      "transition-opacity w-full font-bold text-xl flex items-center gap-4",
                    )}
                  >
                    <>
                      <span className="mb-[3px]">Next</span>
                      <ChevronDown className="w-5 h-5 stroke-[3px]" />
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
