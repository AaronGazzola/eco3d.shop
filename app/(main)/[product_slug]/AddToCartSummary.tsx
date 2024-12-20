"use client";

import { Button } from "@/components/ui/button";
import configuration from "@/configuration";
import { useCartStore } from "@/hooks/useCartStore";
import { useProductStore } from "@/hooks/useProductStore";
import { useToastQueue } from "@/hooks/useToastQueue";
import { useUIStore } from "@/hooks/useUIStore";
import { cn } from "@/lib/utils";
import { AddToCartSummaryProps } from "@/types/product.types";
import { ShoppingBasket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

export function AddToCartSummary({ isNext }: AddToCartSummaryProps) {
  const router = useRouter();
  const { toast } = useToastQueue();
  const { addItem, setCurrentProductPrice } = useCartStore();
  const { toggleDrawer } = useUIStore();
  const { size, colors, primaryMessage, secondaryMessage } = useProductStore();

  const hasWhite = colors.includes("White");

  const getPrice = useCallback(() => {
    switch (size) {
      case "Small":
        return 19.99;
      case "Medium":
        return hasWhite ? 47.99 : 39.99;
      case "Large":
        return hasWhite ? 79.99 : 69.99;
      default:
        return 19.99;
    }
  }, [size, hasWhite]);

  useEffect(() => {
    if (!isNext) return setCurrentProductPrice(0);
    const price = getPrice();
    setCurrentProductPrice(price);
    return () => setCurrentProductPrice(0);
  }, [size, colors, setCurrentProductPrice, getPrice, isNext]);

  const handleAddToCart = () => {
    const getImageUrl = () => {
      switch (size) {
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
      size,
      colors,
      imageUrl: getImageUrl(),
      primaryText: primaryMessage?.split("\n"),
      secondaryText: secondaryMessage || undefined,
    };

    router.push(configuration.paths.appHome + "?disableAnimation=true");

    addItem(item);
    toggleDrawer(true);
    toast({
      title: "Added to cart",
      description: `${item.name} - ${colors.join(", ")}`,
    });
  };

  return (
    <div
      className={cn(
        "w-full border bg-white h-full flex items-center justify-center xs:pr-5",
        isNext && "shadow-[0_-5px_15px_2px_rgba(22,101,52,0.2)]",
      )}
    >
      <div className="max-w-4xl pr-3 xs:pr-0 w-full flex items-center">
        <div className="flex justify-center sm:justify-end flex-grow items-center text-xs xs:text-sm sm:px-10 px-3">
          <div className="flex justify-around max-w-[230] sm:max-w-[270] w-full items-center">
            <div className="flex flex-col gap-1 w-min">
              <span className="text-gray-800 font-medium">{size}</span>
            </div>
            <div className="flex flex-col gap-1 w-min">
              <span className="text-gray-800 font-medium leading-[1.15]">
                {colors.join(", ")}
              </span>
            </div>
            <div className="flex flex-col leading-[1.15] w-min">
              {primaryMessage && (
                <span className="text-gray-800 font-medium">
                  {primaryMessage}
                </span>
              )}
              {secondaryMessage && (
                <span className="text-gray-800 font-medium">
                  {secondaryMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <Button
            size="sm"
            variant="default"
            className="xs:hidden transition-opacity font-bold text-xl flex items-center gap-3"
            disabled={!isNext}
            onClick={handleAddToCart}
          >
            <span className="mb-[3px]">${getPrice().toFixed(2)}</span>
            <span className="mb-[3px] hidden xs:block">Add to cart</span>
            <ShoppingBasket className="w-5 h-5 mb-px" />
          </Button>
          <Button
            size="lg"
            variant="default"
            className="hidden transition-opacity font-bold text-xl xs:flex items-center gap-3"
            disabled={!isNext}
            onClick={handleAddToCart}
          >
            <span className="mb-[3px]">${getPrice().toFixed(2)}</span>
            <span className="mb-[3px] hidden xs:block">Add to cart</span>
            <ShoppingBasket className="w-5 h-5 mb-px" />
          </Button>
        </div>
      </div>
    </div>
  );
}
