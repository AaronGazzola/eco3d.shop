"use client";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/hooks/useCartStore";
import { cn } from "@/lib/utils";
import { Mail, MailCheck } from "lucide-react";

const FreeShippingProgress = ({ onClick }: { onClick: () => void }) => {
  const { items, currentProductPrice } = useCartStore();

  const cartTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = cartTotal + currentProductPrice;
  const progress = Math.min((total / 50) * 100, 100);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 flex-grow justify-end relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="flex items-center gap-3 flex-grow justify-end sm:pr-4">
          <Button
            variant="ghost"
            className="w-full flex items-center gap-1.5 sm:gap-3 flex-grow justify-start h-12 pl-5 sm:px-4 max-w-[260px] sm:max-w-[300px]"
          >
            <div className="relative h-full flex items-start pr-2 overflow-visible mb-0.5">
              <span className="relative text-lg pr-6 font-bold text-green-700 dark:text-green-600">
                <span className="absolute -top-0.5 -left-[9px] text-sm font-semibold">
                  $
                </span>
                {Math.floor(total)}
              </span>
              <div className="absolute -bottom-0 -right-0 w-7 h-7 flex items-end justify-end">
                <div className="border-b-2 absolute w-6 h-1 border-gray-400 -rotate-45 top-1/2 left-1/2 translate-x-[calc(-50%-12px)] translate-y-[calc(-50%-0px)]" />
                <span className="-mr-1 -mb-1 relative font-bold text-gray-600 dark:text-gray-400">
                  <span className="absolute -top-1 -left-2 text-sm font-medium">
                    $
                  </span>
                  50
                </span>
              </div>
            </div>

            <div className="flex-grow h-full relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-lg border-2 flex items-center p-0.5 w-full border-gray-300 dark:border-gray-600">
                  <div
                    className="h-0.5 rounded bg-gradient-to-r from-green-400 to-green-700 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
            <div
              className={cn(
                "w-7 h-10 rounded-full flex flex-col items-center justify-center py-1 group-hover:dark:text-white",
                progress >= 100 ? "dark:text-green-500" : "text-gray-400",
              )}
            >
              {progress >= 100 ? (
                <MailCheck className="w-7 h-7 text-green-700" />
              ) : (
                <Mail className="w-7 h-7 text-gray-400" />
              )}
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FreeShippingProgress;
