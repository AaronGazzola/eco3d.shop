import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MailCheck } from "lucide-react";

const FreeShippingProgress = ({ onClick }: { onClick: () => void }) => {
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
              <span className=" relative text-lg pr-6 font-bold text-green-700 dark:text-green-600">
                <span className="absolute -top-0.5 -left-[9px] text-sm font-semibold">
                  $
                </span>
                50
              </span>
              <div className="absolute -bottom-0 -right-0 w-7 h-7  flex items-end justify-end">
                <div className="border-b-2 absolute w-6 h-1 border-gray-400 -rotate-45 top-1/2 left-1/2 translate-x-[calc(-50%-12px)] translate-y-[calc(-50%-0px)] "></div>
                <span className=" -mr-1 -mb-1 relative font-bold text-gray-600 dark:text-gray-400">
                  <span className="absolute -top-1 -left-2 text-sm font-medium">
                    $
                  </span>
                  50
                </span>
              </div>
            </div>

            <div className="flex-grow  h-full relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-lg border-2 flex items-center p-0.5 w-full border-gray-300 dark:border-gray-600">
                  <div className="w-full h-0.5 rounded bg-gradient-to-r from-green-400 to-green-700"></div>
                </div>
              </div>
            </div>
            <div
              className={cn(
                "w-7 h-10 rounded-full flex flex-col items-center justify-center py-1 group-hover:dark:text-white dark:text-green-500 "
              )}
            >
              <MailCheck className="text-green-700 w-7 h-7" />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FreeShippingProgress;
