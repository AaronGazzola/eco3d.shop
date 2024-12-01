import { AddToCartSummary } from "@/app/(main)/[product_slug]/AddToCartSummary";
import { CustomiseForm } from "@/app/(main)/[product_slug]/CustomiseForm";
import { PersonaliseForm } from "@/app/(main)/[product_slug]/PersonaliseForm";
import { camelCaseToFormattedString } from "@/lib/util/string.util";
import { cn } from "@/lib/utils";
import { AddToCartStep } from "@/types/ui.types";
import { ChevronDown, Pencil, Ruler, ShoppingBasket } from "lucide-react";

const { Customise, Personalise, AddToCart, Select } = AddToCartStep;

// TODO: Move to enums
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

  const fontColorClass = isActive
    ? "text-green-800"
    : isDisabled && isNext
      ? "text-gray-100"
      : isDisabled
        ? "text-gray-500"
        : isNext
          ? "text-gray-50 hover:text-white"
          : "text-gray-800";
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

  return (
    <div
      onClick={() => !isDisabled && onChangeActiveStep(step)}
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
      <div
        className={cn(
          "max-w-4xl w-full flex-grow rounded-t-xl overflow-hidden shadow-xl  transition-colors ease duration-250 px-4",
          isDisabled && !isNext
            ? "bg-gray-200 && cursor-not-allowed"
            : isDisabled && isNext
              ? "bg-green-800  cursor-not-allowed"
              : isNext
                ? "bg-green-700 hover:bg-green-700 cursor-pointer"
                : "bg-white",
          isComplete && "bg-gray-50",
          isActive && "bg-white",
          isAtTop && "border-t",
          !isActive && "select-none",
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
            <div className="flex items-center gap-4">
              {icon}
              <h1 className={cn("text-[2rem] font-semibold", fontColorClass)}>
                {camelCaseToFormattedString(step)}
              </h1>
              {isNext && !isDisabled && (
                <ChevronDown className="w-8 h-8 mt-1 text-white" />
              )}
            </div>

            {isCustomeiseStep ? (
              <CustomiseForm />
            ) : isPersonaliseStep ? (
              <PersonaliseForm />
            ) : isAddToCartStep ? (
              <AddToCartSummary />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPageStep;
