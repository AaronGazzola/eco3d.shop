import { cn } from "@/lib/utils";
import { AddToCartStep } from "@/types/ui.types";
import { Pencil, Ruler, ShoppingBasket } from "lucide-react";

const { Customise, Personalise, AddToCart, Select } = AddToCartStep;

const COLLAPSED_HEIGHT = 70;

const ProductPageStep = ({
  step,
  activeStep,
  onChangeActiveStep,
}: {
  step: AddToCartStep;
  activeStep: AddToCartStep;
  onChangeActiveStep: (step: AddToCartStep) => void;
}) => {
  const isCustomise = step === Customise;
  const isPersonalise = step === Personalise;
  const isAddToCart = step === AddToCart;
  const isActive = step === activeStep;
  const icon =
    step === Customise ? (
      <Ruler className="w-7 h-7 mt-px" />
    ) : step === Personalise ? (
      <Pencil className="w-7 h-7 mt-px" />
    ) : step === AddToCart ? (
      <ShoppingBasket className="w-9 h-9 -mt-px" />
    ) : null;
  return (
    <div
      key={step}
      onClick={() => onChangeActiveStep(step)}
      style={{
        minHeight: COLLAPSED_HEIGHT,
      }}
      className={cn(
        "transition-all ease-out duration-500 relative overflow-hidden cursor-pointer shadow-md",
        isActive && "flex-grow",
      )}
    >
      <div className={cn("absolute inset-0 flex justify-center")}>
        <div className="w-full max-w-7xl flex-grow ">
          <div
            className={cn(
              "flex-grow p-4 pt-3 flex items-center gap-4 text-gray-800",
              isActive && "text-green-800",
            )}
          >
            {icon}
            <h1 className="text-[2rem] font-semibold ">{step}</h1>
          </div>
          <div className="pb-4">
            <p className="mt-2">
              This is the content for the {step} section. It expands to fill the
              available space and scrolls if the content overflows.
            </p>
            <div className="mt-4 space-y-2">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
                lacinia odio vitae vestibulum vestibulum.
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
  );
};

export default ProductPageStep;
