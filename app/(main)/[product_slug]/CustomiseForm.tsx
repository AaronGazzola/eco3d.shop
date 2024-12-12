"use client";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Axis3D, Check, Dot, MoveHorizontal, MoveVertical } from "lucide-react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";

const customiseSchema = z.object({
  size: z.enum(["small", "medium", "large"]),
  colors: z.array(z.string()).nonempty("At least one color must be selected."),
});

export function CustomiseForm({ isAnimating }: { isAnimating: boolean }) {
  const form = useForm({
    resolver: zodResolver(customiseSchema),
    defaultValues: {
      size: "Small",
      colors: [],
    },
  });

  const onSubmit = () => {};

  return (
    <div
      className={cn(
        "flex flex-col-reverse lg:flex-row  h-full",
        isAnimating ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      <div className="lg:aspect-square w-full lg:w-1/2 relative lg:p-0 pt-12 pb-8">
        <Carousel className="asbsolute inset-0">
          <CarouselContent className="flex items-center">
            {[...Array(3)].map((_, index) => (
              <CarouselItem
                key={index}
                className="flex items-center justify-center h-full w-full relative"
              >
                <div className="flex items-center justify-center absolute inset-0">
                  <div className="aspect-square h-full relative ml-4">
                    <CarouselPrevious className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow rounded-full p-2" />
                    <CarouselNext className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow rounded-full p-2" />
                  </div>
                </div>
                <Image
                  className="rounded-lg shadow-lg"
                  src="/images/promo/Aaron_Sept_20_19.jpg"
                  alt="promo"
                  width={500}
                  height={500}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="w-full lg:w-1/2 h-full flex flex-col mt-2 xs:mt-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col justify-center lg:px-6 py-0 xs:py-4"
          >
            <div className="flex flex-col w-full items-center">
              <div className="flex w-full items-center justify-center pt-3.5 pb-1 xs:pt-0">
                <div className="flex-grow justify-center items-center flex">
                  <hr className="w-7/12" />
                </div>
                <span className="font-semibold text-gray-800">Size</span>
                <div className="flex-grow justify-center items-center flex">
                  <hr className="w-7/12" />
                </div>
              </div>
              <div className="w-full max-w-96 lg:max-w-xl border shadow flex items-center text-xs py-1.5 justify-around text-green-900 font-semibold gap-0.5 xs:gap-1 mt-3 mb-6 xs:text-sm p-3 xs:px-1.5">
                <div className="flex items-center gap-1">
                  <MoveHorizontal className="w-4 h-4 hidden xs:block" />
                  <span>Width:</span>
                  <span className="whitespace-nowrap text-gray-900">30cm</span>
                </div>
                <Dot className="w-4 h-4 xs:hidden" />
                <div className="flex items-center gap-1">
                  <MoveVertical className="w-4 h-4 hidden xs:block" />
                  <span>Height:</span>
                  <span className="whitespace-nowrap text-gray-900">30cm</span>
                </div>
                <Dot className="w-4 h-4 xs:hidden" />
                <div className="flex items-center gap-1">
                  <Axis3D className="w-4 h-4 hidden xs:block" />
                  <span>Depth:</span>
                  <span className="whitespace-nowrap text-gray-900">30cm</span>
                </div>
              </div>
            </div>
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem className="flex flex-col w-full items-center">
                  <div className="flex w-full max-w-[480px]">
                    {["Small", "Medium", "Large"].map((size, index) => {
                      const isActive = field.value === size;
                      const isFirst = index === 0;
                      const isLast = index === 2;

                      return (
                        <Button
                          key={size}
                          type="button"
                          variant={isActive ? "secondary" : "outline"}
                          onClick={() => field.onChange(size)}
                          className={cn(
                            "flex-1 font-bold relative",
                            "focus-visible:z-10 hover:z-10 pr-0",
                            isFirst && "rounded-r-none",
                            !isFirst && !isLast && "rounded-none border-l-0",
                            isLast && "rounded-l-none border-l-0",
                            isActive && "z-10",
                          )}
                        >
                          {size}
                          <Check
                            className={cn(
                              "w-4 h-4 ml-2",
                              !isActive && "opacity-0",
                            )}
                          />
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col mt-8">
              <div className="flex w-full items-center justify-center">
                <div className="flex-grow justify-center items-center flex">
                  <hr className="w-7/12" />
                </div>
                <span className="font-semibold text-gray-800">Color</span>
                <div className="flex-grow justify-center items-center flex">
                  <hr className="w-7/12" />
                </div>
              </div>
              <div className="w-full max-w-96 lg:max-w-xl mx-auto rounded-lg bg-gray-400 h-8 mt-3 mb-5"></div>
            </div>
            <FormField
              control={form.control}
              name="colors"
              render={({ field }) => (
                <FormItem className="flex flex-col w-full items-center">
                  <div className="flex w-full max-w-[480px]">
                    <TooltipProvider>
                      {["Natural", "Black", "White"].map((color, index) => {
                        const isLocked = index === 0 || index === 1;
                        const isActive =
                          (field.value as string[]).includes(color) || isLocked;
                        const isFirst = index === 0;
                        const isLast = index === 2;

                        const button = (
                          <Button
                            key={color}
                            type="button"
                            variant={isActive ? "secondary" : "outline"}
                            onClick={() => {
                              if (isLocked) return;
                              const newValue = isActive
                                ? field.value.filter(c => c !== color)
                                : [...field.value, color];
                              field.onChange(newValue);
                            }}
                            className={cn(
                              "w-full font-bold relative",
                              "focus-visible:z-10 hover:z-10 pr-0",
                              isFirst && "rounded-r-none",
                              !isFirst && !isLast && "rounded-none border-l-0",
                              isLast && "rounded-l-none border-l-0",
                              isActive && "z-10",
                              isLocked &&
                                "text-white cursor-default bg-blue-950/75",
                            )}
                          >
                            {color}
                            <Check
                              className={cn(
                                "w-4 h-4 ml-2",
                                !isActive && "opacity-0",
                              )}
                            />
                          </Button>
                        );

                        return (
                          <div key={color} className="flex-1">
                            {isLocked ? (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  {button}
                                </TooltipTrigger>
                                <TooltipContent className="flex items-center gap-1.5 font-bold bg-gray-900 text-white border-none">
                                  This option is required
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              button
                            )}
                          </div>
                        );
                      })}
                    </TooltipProvider>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </div>
  );
}
