"use client";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Axis3D,
  Circle,
  CircleDot,
  Dot,
  Lock,
  MoveHorizontal,
  MoveVertical,
  Square,
  SquareCheckBig,
} from "lucide-react";
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
        "flex flex-col md:flex-row h-full",
        isAnimating ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      <div className="md:aspect-square w-full md:w-1/2 relative">
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

      <div className="w-full md:w-1/2 h-full flex flex-col">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col justify-center p-6"
          >
            <div className="flex flex-col w-full">
              <div className="flex w-full items-center justify-center">
                <div className="flex-grow justify-center items-center flex">
                  <hr className="w-7/12" />
                </div>
                <span className="font-semibold text-gray-800 ">Size</span>
                <div className="flex-grow justify-center items-center flex">
                  <hr className="w-7/12" />
                </div>
              </div>
              <div className="w-full border shadow flex items-center text-xs p-1 px-2.5 text-green-900 font-semibold gap-1 mt-3 mb-5">
                <MoveHorizontal className="w-4 h-4" />
                <span>Width</span>
                <div className="h-3 border w-px" />
                <span className="whitespace-nowrap text-gray-900">30 cm</span>
                <Dot />
                <MoveVertical className="w-4 h-4" />
                <span>Height</span>
                <div className="h-3 border w-px" />
                <span className="whitespace-nowrap text-gray-900">30 cm</span>
                <Dot />
                <Axis3D className="w-4 h-4" />
                <span>Depth</span>
                <div className="h-3 border w-px" />
                <span className="whitespace-nowrap text-gray-900">30cm</span>
              </div>
            </div>
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-4">
                    {["Small", "Medium", "Large"].map(size => {
                      const isActive = field.value === size;
                      return (
                        <div
                          key={size}
                          className="flex-1 flex flex-col gap-2 group"
                        >
                          <Button
                            type="button"
                            variant={isActive ? "secondary" : "outline"}
                            onClick={() => field.onChange(size)}
                            className="gap-3 font-bold group hover:opacity-100 z-10"
                          >
                            {isActive ? (
                              <CircleDot className="w-[1.1rem] h-[1.1rem]" />
                            ) : (
                              <Circle className="w-[1.1rem] h-[1.1rem]" />
                            )}
                            {size}
                          </Button>
                          {isActive && (
                            <FormDescription
                              className={cn(
                                "flex gap-2 items-center p-1 w-full justify-center font-bold text-secondary",
                                size === "Small" && "opacity-0",
                              )}
                            >
                              <span className="whitespace-nowrap w-min text-secondary bg-white px-3.5 pt-5 pb-2 rounded shadow border -mt-7">
                                + $3.39
                              </span>
                            </FormDescription>
                          )}
                        </div>
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
                <span className="font-semibold text-gray-800 ">Color</span>
                <div className="flex-grow justify-center items-center flex">
                  <hr className="w-7/12" />
                </div>
              </div>
              <div className="w-full rounded-lg bg-gray-400 h-8 mt-3 mb-5"></div>
            </div>
            <FormField
              control={form.control}
              name="colors"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-4">
                    {["Natural", "Black", "White"].map((color: string, i) => {
                      const isLocked = i === 0 || i === 1;
                      const isActive =
                        (field.value as string[]).includes(color) || isLocked;
                      return (
                        <div
                          key={color}
                          className="flex-grow flex h-min flex-col group gap-1"
                        >
                          <Button
                            key={color}
                            type="button"
                            variant={isActive ? "secondary" : "outline"}
                            onClick={() => {
                              const newValue = isActive
                                ? field.value.filter(c => c !== color)
                                : [...field.value, color];
                              field.onChange(newValue);
                            }}
                            className={cn(
                              "flex-1 font-bold group gap-3 z-10",
                              isLocked && "cursor-default opacity-80",
                            )}
                          >
                            {isActive ? (
                              <SquareCheckBig className="w-[1.2rem] h-[1.2rem]" />
                            ) : (
                              <Square className="w-[1.2rem] h-[1.2rem]" />
                            )}
                            {color}
                          </Button>
                          {/* TODO: animate drop down */}
                          {isActive && (
                            <FormDescription className="flex gap-2 items-center p-1 w-full justify-center font-bold text-secondary ">
                              <span
                                className={cn(
                                  "whitespace-nowrap w-min text-secondary bg-white px-3.5 pt-5 pb-2 rounded shadow border -mt-6 flex items-center gap-1.5",
                                  isLocked && "bg-gray-50 select-none",
                                )}
                              >
                                {isLocked ? (
                                  <>
                                    <Lock className="w-4 h-4 stroke-[3px] text-gray-700" />
                                    <span className="text-gray-700">
                                      Required
                                    </span>
                                  </>
                                ) : (
                                  "+ $3.39"
                                )}
                              </span>
                            </FormDescription>
                          )}
                        </div>
                      );
                    })}
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
