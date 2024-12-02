import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Equal, Plus, ShoppingBasket } from "lucide-react";

export function AddToCartSummary() {
  return (
    <div className="w-full border shadow-lg bg-white h-full flex items-center justify-center">
      <div className="max-w-4xl px-6 w-full flex items-center justify-between gap-4">
        <div className="h-full flex-grow flex items-center justify-center gap-2 ">
          <div className="flex items-center">
            <div className="flex flex-col items-center border border-primary rounded-full bg-gray-50 p-1 px-6 font-bold text-gray-900">
              <span className="text-sm">Small</span>
              <span className="text-base">$34.28</span>
            </div>
          </div>
          <Plus className="w-8 h-8 text-primary" />
          <div className="flex items-center">
            <div className="flex flex-col items-center border border-primary rounded-full bg-gray-50 p-1 px-6 font-bold text-gray-900">
              <span className="text-sm">White</span>
              <span className="text-base">$4.28</span>
            </div>
          </div>
          <Equal className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold text-gray-800">$45.24</span>
        </div>
        <Button
          variant="default"
          className={cn(
            "transition-opacity min-w-[20rem] font-bold text-xl flex items-center gap-4",
          )}
        >
          <>
            <span className="mb-[3px]">Add to cart</span>
            <ShoppingBasket className="w-5 h-5" />
          </>
        </Button>
      </div>
    </div>
  );
}
