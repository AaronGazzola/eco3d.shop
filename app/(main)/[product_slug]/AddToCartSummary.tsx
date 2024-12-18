"use client";

import { Button } from "@/components/ui/button";
import { TooltipContent } from "@/components/ui/tooltip";
import configuration from "@/configuration";
import { useCartStore } from "@/hooks/useCartStore";
import { useToastQueue } from "@/hooks/useToastQueue";
import { useUIStore } from "@/hooks/useUIStore";
import { cn } from "@/lib/utils";
import { AddToCartSummaryProps, ImageSize } from "@/types/product.types";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { Clock, Plus, ShoppingBasket, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";

export function AddToCartSummary({ isNext }: AddToCartSummaryProps) {
  const router = useRouter();
  const [size] = useQueryState("size");
  const sizeVal = (size as ImageSize) || "Small";
  const [colors] = useQueryState("colors");
  const [primary] = useQueryState("primary");
  const [secondary] = useQueryState("secondary");
  const { toast } = useToastQueue();
  const addItem = useCartStore((state) => state.addItem);
  const { toggleDrawer } = useUIStore();

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

  const handleAddToCart = () => {
    const getImageUrl = () => {
      switch (sizeVal) {
        case "Small":
          return "/images/products/V8/small/Set 3 second shoot-28.jpg";
        case "Medium":
          return "/images/products/V8/medium/Set 3 second shoot-24.jpg";
        case "Large":
          return "/images/products/V8/Large/Set 3 second shoot-4.jpg";
        default:
          return "/images/products/V8/small/Set 3 second shoot-28.jpg";
      }
    };

    const item = {
      id: Date.now(),
      name: `Model V8`,
      price: getPrice(),
      quantity: 1,
      size: sizeVal,
      colors: parsedColors,
      imageUrl: getImageUrl(),
      primaryText: primary?.split("\n"),
      secondaryText: secondary || undefined,
    };

    router.push(configuration.paths.appHome);

    addItem(item);
    toggleDrawer(true);
    toast({
      title: "Added to cart",
      description: `${item.name} - ${parsedColors.join(", ")}`,
    });
  };

  return (
    <div
      className={cn(
        "w-full border bg-white h-full flex items-center justify-center xs:pr-5",
        isNext && "shadow-[0_-5px_15px_2px_rgba(22,101,52,0.2)]",
      )}
    >
      <div className="max-w-4xl pr-3 xs:pr-0 w-full flex items-center ">
        <div className="flex justify-center sm:justify-end flex-grow items-center text-xs xs:text-sm sm:px-10 px-3">
          <div className="flex justify-around max-w-[230] sm:max-w-[270] w-full items-center">
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <Truck className="w-5 h-5 xs:hidden text-green-900" />
                  <span className="text-sm font-bold text-green-900">
                    <span className="hidden xs:inline">Est. Delivery by:</span>{" "}
                    25 Nov 2024
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="transition-opacity font-bold text-xl flex items-center gap-3"
                  disabled={!isNext}
                  onClick={handleAddToCart}
                >
                  <span className="mb-[3px]">${getPrice().toFixed(2)}</span>
                  <span className="mb-[3px] hidden xs:block">Add to cart</span>
                  <ShoppingBasket className="w-5 h-5 mb-px" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent className="flex pb-6 pt-3 px-5 gap-2">
              <div className="flex flex-col items-center gap-2">
                Print time:
                <span className="bg-white rounded-full flex items-center gap-1.5 justify-center text-black px-2.5 py-1.5">
                  <Clock className="w-5 h-5" />
                  36d 37h 12m
                </span>
              </div>
              <Plus className="w-6 h-6 text-gray-100" />
              <div className="flex flex-col items-center gap-2">
                Delivery time:
                <span className="bg-white rounded-full flex items-center gap-1.5 justify-center text-black px-2.5 py-1.5">
                  <Truck className="w-5 h-5" />
                  36d
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
