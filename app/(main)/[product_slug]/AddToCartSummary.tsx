import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Plus, ShoppingBasket } from "lucide-react";

export function AddToCartSummary({ isNext }: { isNext: boolean }) {
  return (
    <div
      className={cn(
        "w-full border bg-white h-full flex items-center justify-center",
        isNext && "shadow-[0_-5px_15px_2px_rgba(22,101,52,0.2)]",
      )}
    >
      <div className="max-w-4xl px-6 w-full flex items-center justify-between gap-4">
        <div className="h-full flex-grow flex items-center justify-center gap-2 ">
          <div className="flex flex-col items-center rounded-lg shadow-lg  p-1 px-5 font-bold text-gray-900">
            <span className="text-sm whitespace-nowrap">Base price</span>
            <span className="text-lg">$34.28</span>
          </div>
          <Plus className="w-5 h-5 text-secondary" />
          <div className="flex flex-col items-center rounded-lg shadow-lg  p-1 px-5 font-bold text-gray-900">
            <span className="text-sm whitespace-nowrap">Small</span>
            <span className="text-lg">$34.28</span>
          </div>
          <Plus className="w-5 h-5 text-secondary" />
          <div className="flex flex-col items-center rounded-lg shadow-lg  p-1 px-5 font-bold text-gray-900">
            <span className="text-sm whitespace-nowrap">White</span>
            <span className="text-lg">$34.28</span>
          </div>
        </div>
        <Button
          variant="default"
          className={cn(
            "transition-opacity min-w-[20rem] font-bold text-xl flex items-center gap-4 w-1/2",
          )}
          disabled={!isNext}
        >
          <>
            <span className="mb-[3px]">$46.68</span>
            <ArrowRight className="w-5 h-5" />
            <span className="mb-[3px]">Add to cart</span>
            <ShoppingBasket className="w-5 h-5" />
          </>
        </Button>
      </div>
    </div>
  );
}
