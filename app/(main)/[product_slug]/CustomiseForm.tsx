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
import {
  ALL_IMAGES,
  COMMON_IMAGES,
  DIMENSIONS_BY_SIZE,
  MATERIAL_IMAGE_MAP,
  NON_WHITE_IMAGES,
  SIZE_BASED_IMAGES,
  WHITE_IMAGES,
} from "@/constants/product.constants";
import { useProductStore } from "@/hooks/useProductStore";
import { cn } from "@/lib/utils";
import {
  CustomiseFormProps,
  FormValues,
  ImageSize,
} from "@/types/product.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Axis3D, Check, MoveHorizontal, MoveVertical } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const customiseSchema = z.object({
  size: z.enum(["Small", "Medium", "Large"]),
  colors: z.array(z.string()).nonempty("At least one color must be selected."),
});

export function CustomiseForm({ isAnimating }: CustomiseFormProps) {
  const { size, colors, setSize, setColors } = useProductStore();
  const isMounted = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(customiseSchema),
    defaultValues: {
      size,
      colors,
    },
  });

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "size" && value.size) {
        if (value.size === "Small" && colors.includes("White")) {
          const newColors = colors.filter((c) => c !== "White");
          form.setValue("colors", newColors);
          setColors(newColors);
        }
        setSize(value.size);
      }
      if (name === "colors" && value.colors) {
        setColors(value.colors as string[]);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, setSize, setColors, colors]);

  const hasWhite = colors.includes("White");
  const getImages = () => [
    ...SIZE_BASED_IMAGES[size],
    ...COMMON_IMAGES,
    ...(hasWhite ? WHITE_IMAGES : NON_WHITE_IMAGES[size]),
  ];

  const renderDimensionInfo = (
    icon: React.ReactNode,
    label: string,
    value: string,
  ) => (
    <div className="flex items-center xs:gap-1 gap-0.5">
      {icon}
      <span>{label}:</span>
      <span className="whitespace-nowrap text-gray-900">{value}</span>
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col-reverse lg:flex-row h-full overflow-x-hidden px-2 xs:px-3 xs:pl-4 pt-1.5",
        isAnimating ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      <div className="lg:aspect-square w-full lg:w-1/2 relative lg:p-0">
        <Carousel className="lg:absolute lg:inset-0">
          <CarouselContent className="flex items-center pt-8 lg:pt-0 pb-4">
            {getImages().map((src, index) => (
              <CarouselItem
                key={index}
                className="flex items-center justify-center h-full w-full relative"
              >
                <div className="flex items-center justify-center absolute inset-0 left-4">
                  <div className="aspect-square h-full relative ml-4">
                    <CarouselPrevious className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow rounded-full p-2" />
                    <CarouselNext className="absolute right-6 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow rounded-full p-2" />
                  </div>
                </div>
                <Image
                  className="rounded-lg shadow-lg"
                  src={src}
                  alt={`Product view ${index + 1}`}
                  width={500}
                  height={500}
                  priority
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="hidden">
          {ALL_IMAGES.map((src: string, index: number) => (
            <Image
              key={index}
              src={src}
              alt="Preload"
              width={500}
              height={500}
              priority
            />
          ))}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col flex-shrink-0">
        <Form {...form}>
          <form className="flex flex-col justify-center lg:px-3 py-0">
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

              <div className="w-full max-w-[450] lg:max-w-xl border shadow flex items-center text-xs py-1.5 justify-around text-green-900 font-semibold gap-1 xs:gap-2 mt-3 mb-6 xs:text-sm p-3 xs:px-1.5">
                {renderDimensionInfo(
                  <MoveHorizontal className="hidden xs:block w-4 h-4" />,
                  "Width",
                  DIMENSIONS_BY_SIZE[size].width,
                )}
                {renderDimensionInfo(
                  <MoveVertical className="hidden xs:block w-4 h-4" />,
                  "Height",
                  DIMENSIONS_BY_SIZE[size].height,
                )}
                {renderDimensionInfo(
                  <Axis3D className="hidden xs:block w-4 h-4" />,
                  "Depth",
                  DIMENSIONS_BY_SIZE[size].depth,
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem className="flex flex-col w-full items-center">
                  <div className="flex w-full max-w-[480px]">
                    {(["Small", "Medium", "Large"] as ImageSize[]).map(
                      (size, index) => {
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
                      },
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col mt-8">
              <div className="flex w-full items-center justify-center mb-4">
                <div className="flex-grow justify-center items-center flex">
                  <hr className="w-7/12" />
                </div>
                <span className="font-semibold text-gray-800">Color</span>
                <div className="flex-grow justify-center items-center flex">
                  <hr className="w-7/12" />
                </div>
              </div>

              <div className="flex w-full items-center justify-center">
                <div className="flex w-full max-w-[480px]">
                  <div className="w-full flex rounded-t-lg overflow-hidden">
                    {["Natural", "Black", "White"].map((color, index) => {
                      const isSelected = colors.includes(color);
                      const imageSrc = MATERIAL_IMAGE_MAP[color];
                      return (
                        <div
                          key={color}
                          className="flex-1 relative overflow-hidden h-12"
                        >
                          {isSelected && (
                            <div
                              className={cn(
                                "absolute w-full aspect-square bg-green-900/50 z-0",
                                color === "Black" &&
                                  "-translate-y-[29%] -translate-x-3 scale-[150%]",
                                color === "White" && "-translate-y-[38%]",
                                color === "Natural" && "-translate-y-[50%]",
                              )}
                            >
                              <Image
                                src={imageSrc ?? ""}
                                alt={`${color} material sample`}
                                fill
                                className="object-cover"
                                priority
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
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
                        const isWhite = color === "White";
                        const isSmallSize = size === "Small";
                        const isDisabled = isWhite && isSmallSize;
                        const isActive =
                          field.value.includes(color) ||
                          (isLocked && !isDisabled);
                        const isFirst = index === 0;
                        const isLast = index === 2;

                        const button = (
                          <Button
                            key={color}
                            type="button"
                            variant={isActive ? "secondary" : "outline"}
                            onClick={() => {
                              if (isLocked || isDisabled) return;
                              const newValue = isActive
                                ? field.value.filter((c: string) => c !== color)
                                : [...field.value, color];
                              field.onChange(newValue);
                            }}
                            className={cn(
                              "w-full font-bold relative",
                              "focus-visible:z-10 hover:z-10 pr-0",
                              isFirst && "rounded-r-none rounded-t-none",
                              !isFirst && !isLast && "rounded-none border-l-0",
                              isLast &&
                                "rounded-l-none border-l-0 rounded-t-none",
                              isActive && "z-10",
                              isLocked &&
                                "text-white cursor-default bg-blue-950/75",
                              isDisabled && "opacity-50 cursor-not-allowed",
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
                            {isDisabled || isLocked ? (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  {button}
                                </TooltipTrigger>
                                <TooltipContent className="flex items-center gap-1.5 font-bold bg-gray-900 text-white border-none">
                                  {isLocked
                                    ? "This option is required"
                                    : "Color not available for selected size"}
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
