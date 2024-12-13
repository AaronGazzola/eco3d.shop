"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShoppingBasket } from "lucide-react";
import { useQueryState } from "nuqs";

export function AddToCartSummary({ isNext }: { isNext: boolean }) {
  const [size] = useQueryState("size");
  const sizeVal = size || "Small";
  const [colors] = useQueryState("colors");
  const [primary] = useQueryState("primary");
  const [secondary] = useQueryState("secondary");

  const parsedColors = colors ? JSON.parse(colors) : ["Black", "Natural"];
  const hasWhite = parsedColors.includes("White");

  const getPrice = () => {
    switch (sizeVal) {
      case "Small":
        return 19.99;
      case "Medium":
        return hasWhite ? 47.99 : 39.99;
      case "Large":
        return hasWhite ? 79.99 : 69.99;
      default:
        return 19.99;
    }
  };

  return (
    <div
      className={cn(
        "w-full border bg-white h-full flex items-center justify-center xs:pr-5",
        isNext && "shadow-[0_-5px_15px_2px_rgba(22,101,52,0.2)]",
      )}
    >
      <div className="max-w-4xl pr-2 w-full flex items-center ">
        <div className="flex justify-center sm:justify-end flex-grow items-center text-xs xs:text-sm sm:px-10 px-3">
          <div className="flex justify-between max-w-[230] sm:max-w-[270] w-full items-center">
            <div className="flex flex-col gap-1 w-min">
              <span className="text-gray-800 font-medium">{sizeVal}</span>
            </div>
            <div className="flex flex-col gap-1 w-min">
              <span className="text-gray-800 font-medium leading-[1.15]">
                {parsedColors.join(", ")}
              </span>
            </div>

            <div className="flex flex-col leading-[1.15] w-min">
              {primary && (
                <span className="text-gray-800 font-medium">{primary}</span>
              )}
              {secondary && (
                <span className="text-gray-800 font-medium">{secondary}</span>
              )}
            </div>
          </div>
        </div>

        <Button
          size="lg"
          variant="default"
          className="transition-opacity font-bold text-xl items-center gap-3 hidden lg:flex"
          disabled={!isNext}
        >
          <span className="mb-[3px]">${getPrice().toFixed(2)}</span>

          <span className="mb-[3px] hidden xs:block">Add to cart</span>
          <ShoppingBasket className="w-5 h-5 mb-px" />
        </Button>
        <Button
          size="sm"
          variant="default"
          className="transition-opacity font-bold text-xl flex items-center gap-3 lg:hidden"
          disabled={!isNext}
        >
          <span className="mb-[3px]">${getPrice().toFixed(2)}</span>

          <span className="mb-[3px] hidden xs:block">Add to cart</span>
          <ShoppingBasket className="w-5 h-5 mb-px" />
        </Button>
      </div>
    </div>
  );
}
