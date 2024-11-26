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
  const isActive = step === activeStep;
  const isNext =
    (step === Personalise && activeStep === Customise) ||
    (step === AddToCart && activeStep === Personalise);
  const isDisabled =
    isDisabledProp || (step === AddToCart && activeStep === Customise);
  const isComplete =
    (step === Personalise && activeStep === AddToCart) ||
    (step === Customise &&
      (activeStep === Personalise || activeStep === AddToCart));

  const fontColorClass = isDisabled
    ? "text-gray-500"
    : isNext
      ? "text-gray-50 hover:text-white"
      : "";
  const icon =
    step === Customise ? (
      <Ruler className={cn("w-7 h-7 mt-px", fontColorClass)} />
    ) : step === Personalise ? (
      <Pencil className={cn("w-7 h-7 mt-px", fontColorClass)} />
    ) : step === AddToCart ? (
      <ShoppingBasket className={cn("w-9 h-9 -mt-px", fontColorClass)} />
    ) : null;
  return (
    <div
      key={step}
      onClick={() => !isDisabled && onChangeActiveStep(step)}
      style={{
        minHeight: COLLAPSED_HEIGHT,
      }}
      className={cn(
        "transition-all ease-in-out duration-700 relative overflow-hidden cursor-pointer shadow-md",
        isActive && "flex-grow",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 flex justify-center group",
          isNext && "bg-green-700/90 hover:bg-green-700",
          isDisabled && "bg-gray-200 && cursor-not-allowed",
        )}
        style={{
          maxHeight: isActive ? "100vh" : COLLAPSED_HEIGHT,
        }}
      >
        <div className="w-full max-w-7xl flex-grow ">
          <div
            className={cn(
              "flex-grow p-4 pt-3 flex items-center gap-4 text-gray-800",
              isActive && "text-green-800",
            )}
          >
            {icon}
            <h1 className={cn("text-[2rem] font-semibold", fontColorClass)}>
              {step}
            </h1>
            {/* TODO: add order details summary related completed step  */}
            {isNext && !isDisabled && (
              <ChevronDown className="w-7 h-7 mt-1 text-white" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPageStep;
