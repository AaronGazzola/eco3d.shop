import { AddToCartSummary } from "@/app/(main)/[product_slug]/AddToCartSummary";
import { CustomiseForm } from "@/app/(main)/[product_slug]/CustomiseForm";
import { PersonaliseForm } from "@/app/(main)/[product_slug]/PersonaliseForm";
import { camelCaseToFormattedString } from "@/lib/util/string.util";
import { cn } from "@/lib/utils";
import { AddToCartStep } from "@/types/ui.types";
import { ChevronDown, Pencil, Ruler, ShoppingBasket } from "lucide-react";

const { Customise, Personalise, AddToCart, Select } = AddToCartStep;

const COLLAPSED_HEIGHT = 70;

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
    ? COLLAPSED_HEIGHT * 2
    : isAddToCartStep
      ? COLLAPSED_HEIGHT
      : 0;
  const top = isAtTop
    ? `${
        isPersonaliseStep
          ? COLLAPSED_HEIGHT
          : isAddToCartStep
            ? COLLAPSED_HEIGHT * 2
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
          "max-w-4xl w-full flex-grow rounded-t-xl overflow-hidden shadow-xl border-t transition-colors ease duration-250",
          isDisabled && !isNext
            ? "bg-gray-200 && cursor-not-allowed"
            : isDisabled && isNext
              ? "bg-green-800/70  cursor-not-allowed"
              : isNext
                ? "bg-green-700/90 hover:bg-green-700 cursor-pointer"
                : "",
          isComplete && "bg-gray-50",
          isActive && "bg-white",
        )}
      >
        <div
          className={cn(
            "flex-grow p-4 pt-3 pr-10 flex items-center justify-between gap-4 ",
            isActive && "text-green-800",
          )}
        >
          <div className="flex items-center gap-4">
            {icon}
            <h1 className={cn("text-[2rem] font-semibold", fontColorClass)}>
              {camelCaseToFormattedString(step)}
            </h1>
          </div>
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
  );
};

export default ProductPageStep;
