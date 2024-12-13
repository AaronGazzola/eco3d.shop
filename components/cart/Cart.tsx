import { cn } from "@/lib/utils";
import { CreditCard, TableProperties, Truck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type CartStep = "Review" | "Shipping" | "Payment";

const COLLAPSED_STEP_HEIGHT = 65;
const EXPANDED_HEADER_HEIGHT = 92;

type CartItem = {
  id: number;
  name: string;
  imageUrl: string;
  size: "Small" | "Medium" | "Large";
  colors: string[];
  primaryText?: string;
  secondaryText?: string;
  price: number;
};

const cartItems: CartItem[] = [
  {
    id: 1,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/small/Set 3 second shoot-27.jpg",
    size: "Small",
    colors: ["Natural", "Black"],
    primaryText: "Happy\nBirthday",
    price: 19.99,
  },
  {
    id: 2,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    size: "Medium",
    colors: ["Natural", "Black"],
    primaryText: "Merry\nChristmas\nDad",
    secondaryText: "From John",
    price: 39.99,
  },
  {
    id: 3,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    size: "Medium",
    colors: ["Natural", "Black"],
    primaryText: "Merry\nChristmas\nDad",
    secondaryText: "From John",
    price: 39.99,
  },
  {
    id: 4,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    size: "Medium",
    colors: ["Natural", "Black"],
    primaryText: "Merry\nChristmas\nDad",
    secondaryText: "From John",
    price: 39.99,
  },
  {
    id: 5,
    name: "V8 Engine",
    imageUrl: "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    size: "Medium",
    colors: ["Natural", "Black"],
    primaryText: "Merry\nChristmas\nDad",
    secondaryText: "From John",
    price: 39.99,
  },
];

export function Cart() {
  const [activeStep, setActiveStep] = useState<CartStep>("Review");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleStepChange = (step: CartStep) => {
    if (isNextStepEnabled(step)) {
      setIsTransitioning(true);
      setActiveStep(step);
      setTimeout(() => setIsTransitioning(false), 600);
    }
  };

  const isNextStepEnabled = (step: CartStep) => {
    if (step === "Review") return true;
    if (step === "Shipping")
      return activeStep === "Review" || isStepComplete(step);
    if (step === "Payment")
      return activeStep === "Shipping" || isStepComplete(step);
    return false;
  };

  const isStepComplete = (step: CartStep) => {
    switch (step) {
      case "Review":
        return activeStep === "Shipping" || activeStep === "Payment";
      case "Shipping":
        return activeStep === "Payment";
      default:
        return false;
    }
  };

  const CartStep = ({ step }: { step: CartStep }) => {
    const isActive = step === activeStep;
    const isComplete = isStepComplete(step);
    const isNext =
      (step === "Shipping" && activeStep === "Review") ||
      (step === "Payment" && activeStep === "Shipping");
    const isDisabled = !isNextStepEnabled(step);

    const icon =
      step === "Review" ? (
        <TableProperties
          className={cn("w-6 h-6", isActive && "text-primary")}
        />
      ) : step === "Shipping" ? (
        <Truck className={cn("w-6 h-6", isActive && "text-primary")} />
      ) : (
        <CreditCard className={cn("w-6 h-6", isActive && "text-primary")} />
      );

    const isAtTop = isComplete || isActive;
    const bottomHeight =
      step === "Review"
        ? COLLAPSED_STEP_HEIGHT * 3 + 8
        : step === "Shipping"
          ? COLLAPSED_STEP_HEIGHT * 2 + 8
          : COLLAPSED_STEP_HEIGHT;

    const top = isAtTop
      ? step === "Review"
        ? 0
        : step === "Shipping"
          ? COLLAPSED_STEP_HEIGHT
          : COLLAPSED_STEP_HEIGHT * 2
      : `calc(100% - ${bottomHeight}px)`;

    return (
      <div
        onClick={() => !isDisabled && handleStepChange(step)}
        className={cn(
          "absolute inset-0 flex flex-col items-center transition-all duration-600",
          step === "Shipping" && "z-10",
          step === "Payment" && "z-20",
          !isDisabled && "cursor-pointer",
        )}
        style={{
          top,
          transition: "top 0.6s ease-in-out",
        }}
      >
        <div
          className={cn(
            "max-w-4xl w-full flex-grow rounded-t-xl overflow-hidden shadow-xl transition-colors duration-250 pl-4 border border-gray-200 bg-white",
            isNext && "shadow-primary/20",
          )}
        >
          <div className="flex-grow relative h-full">
            <div
              className={cn(
                "absolute inset-0 flex flex-col gap-4 transition-all p-4 pr-0",
                isActive && "text-primary",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {icon}
                  <h2
                    className={cn(
                      "text-2xl font-semibold",
                      isActive && "text-primary",
                    )}
                  >
                    {step}
                  </h2>
                </div>
              </div>
              <div className="overflow-y-auto">
                {isActive && (
                  <div className="mt-4">
                    {step === "Review" && (
                      <div className="space-y-4">
                        {cartItems.map(item => (
                          <div
                            key={item.id}
                            className="flex items-start space-x-4 border-b border-gray-200 pb-4"
                          >
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={80}
                              height={80}
                              className="rounded-md object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="font-bold">{item.name}</h3>
                              <div className="text-sm space-y-1 text-gray-600">
                                <p>Size: {item.size}</p>
                                <p>Colors: {item.colors.join(", ")}</p>
                                {item.primaryText && (
                                  <p className="whitespace-pre-line">
                                    Primary text: {item.primaryText}
                                  </p>
                                )}
                                {item.secondaryText && (
                                  <p>Secondary text: {item.secondaryText}</p>
                                )}
                              </div>
                              <p className="font-semibold mt-2">
                                ${item.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {step === "Shipping" && (
                      <div className="space-y-4">
                        <p>Shipping form will go here</p>
                      </div>
                    )}

                    {step === "Payment" && (
                      <div>
                        <p>Stripe payment form will go here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div
                style={{
                  height:
                    step === "Review"
                      ? COLLAPSED_STEP_HEIGHT * 3
                      : step === "Shipping"
                        ? COLLAPSED_STEP_HEIGHT + 2
                        : COLLAPSED_STEP_HEIGHT,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full">
      <CartStep step="Review" />
      <CartStep step="Shipping" />
      <CartStep step="Payment" />
    </div>
  );
}

export default Cart;
