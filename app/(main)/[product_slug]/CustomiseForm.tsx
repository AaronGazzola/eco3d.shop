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
import useIsMounted from "@/hooks/useIsMounted";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Axis3D, Check, MoveHorizontal, MoveVertical } from "lucide-react";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const customiseSchema = z.object({
  size: z.enum(["Small", "Medium", "Large"]),
  colors: z.array(z.string()).nonempty("At least one color must be selected."),
});

const sizeBasedImages = {
  Small: [
    "/images/products/V8/small/Set 3 second shoot-27.jpg",
    "/images/products/V8/small/Set 3 second shoot-28.jpg",
    "/images/products/V8/small/Set 3 second shoot-29.jpg",
    "/images/products/V8/small/Set 3 second shoot-30.jpg",
    "/images/products/V8/small/Set 3 second shoot-31.jpg",
    "/images/products/V8/small/Set 3 second shoot-32.jpg",
    "/images/products/V8/small/Set 3 second shoot-33.jpg",
    "/images/products/V8/small/Set 3 second shoot-45.jpg",
    "/images/products/V8/small/Set 3 second shoot-46.jpg",
    "/images/products/V8/small/Set 3 second shoot-47.jpg",
    "/images/products/V8/small/Set 3 second shoot-48.jpg",
  ],
  Medium: [
    "/images/products/V8/medium/Set 3 second shoot-19.jpg",
    "/images/products/V8/medium/Set 3 second shoot-20.jpg",
    "/images/products/V8/medium/Set 3 second shoot-21.jpg",
    "/images/products/V8/medium/Set 3 second shoot-22.jpg",
    "/images/products/V8/medium/Set 3 second shoot-23.jpg",
    "/images/products/V8/medium/Set 3 second shoot-24.jpg",
    "/images/products/V8/medium/Set 3 second shoot-25.jpg",
    "/images/products/V8/medium/Set 3 second shoot-26.jpg",
    "/images/products/V8/medium/Set 3 second shoot-42.jpg",
    "/images/products/V8/medium/Set 3 second shoot-43.jpg",
    "/images/products/V8/medium/Set 3 second shoot-44.jpg",
  ],
  Large: [
    "/images/products/V8/large/Set 3 second shoot-3.jpg",
    "/images/products/V8/large/Set 3 second shoot-4.jpg",
    "/images/products/V8/large/Set 3 second shoot-5.jpg",
    "/images/products/V8/large/Set 3 second shoot-6.jpg",
    "/images/products/V8/large/Set 3 second shoot-7.jpg",
    "/images/products/V8/large/Set 3 second shoot-39.jpg",
    "/images/products/V8/large/Set 3 second shoot-40.jpg",
    "/images/products/V8/large/Set 3 second shoot-41.jpg",
  ],
};

const whiteImages = [
  "/images/products/V8/details/Aaron set 3-31.jpg",
  "/images/products/V8/details/Aaron set 3-32.jpg",
  "/images/products/V8/details/Aaron set 3-40.jpg",
  "/images/products/V8/details/Aaron set 3-41.jpg",
];

const nonWhiteImages = {
  Large: [
    "/images/products/V8/details/Aaron set 3-29.jpg",
    "/images/products/V8/details/Aaron set 3-30.jpg",
  ],
  Medium: [
    "/images/products/V8/details/Aaron set 3-37.jpg",
    "/images/products/V8/details/Aaron set 3-30.jpg",
  ],
  Small: ["/images/products/V8/details/Aaron set 3-33.jpg"],
};

const commonImages = [
  "/images/products/V8/details/Aaron set 3-39.jpg",
  "/images/products/V8/details/Aaron set 3-42.jpg",
  "/images/products/V8/Set 3 second shoot-34.jpg",
  "/images/products/V8/Set 3 second shoot-37.jpg",
  "/images/products/V8/Set 3 second shoot-38.jpg",
];

const allImages = [
  ...Object.values(sizeBasedImages).flat(),
  ...whiteImages,
  ...Object.values(nonWhiteImages).flat(),
  ...commonImages,
];

export function CustomiseForm({ isAnimating }: { isAnimating: boolean }) {
  const isMounted = useIsMounted();
  const [isInit, setIsInit] = useState(false);

  const [sizeParam, setSizeParam] = useQueryState("size", {
    defaultValue: "Small",
    parse: (value: string | null): "Small" | "Medium" | "Large" =>
      ["Small", "Medium", "Large"].includes(value || "")
        ? (value as "Small" | "Medium" | "Large")
        : "Small",
  });

  const [colorsParam, setColorsParam] = useQueryState("colors", {
    defaultValue: '["Natural","Black"]',
    parse: (value: string | null) => {
      try {
        const parsed = JSON.parse(value || '["Natural","Black"]');
        return Array.isArray(parsed)
          ? JSON.stringify(parsed)
          : '["Natural","Black"]';
      } catch {
        return '["Natural","Black"]';
      }
    },
  });

  type FormValues = {
    size: "Small" | "Medium" | "Large";
    colors: string[];
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(customiseSchema),
    defaultValues: {
      size: sizeParam as "Small" | "Medium" | "Large" | undefined,
      colors: JSON.parse(colorsParam),
    },
  });

  const size = form.watch("size");
  const colors = form.watch("colors");

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "size" && value.size && value.size !== sizeParam) {
        setSizeParam(value.size);
      }
      if (name === "colors" && value.colors) {
        const parsedColorsParam = JSON.parse(colorsParam || "[]");
        if (
          JSON.stringify(value.colors.sort()) !==
          JSON.stringify(parsedColorsParam.sort())
        ) {
          setColorsParam(JSON.stringify(value.colors));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, setSizeParam, setColorsParam, sizeParam, colorsParam]);

  useEffect(() => {
    if (isMounted && !isInit) {
      setIsInit(true);
      setSizeParam(sizeParam || "Small");
      setColorsParam(colorsParam || '["Natural","Black"]');
    }
  }, [isMounted, setSizeParam, setColorsParam, sizeParam, colorsParam, isInit]);

  useEffect(() => {
    const newSize = (sizeParam || "Small") as "Small" | "Medium" | "Large";
    const newColors = JSON.parse(
      colorsParam || '["Natural","Black"]',
    ) as string[];
    form.reset({ size: newSize, colors: newColors });
  }, [sizeParam, colorsParam, form]);

  useEffect(() => {
    if (size === "Small" && Array.isArray(colors) && colors.includes("White")) {
      form.setValue(
        "colors",
        colors.filter((c: string) => c !== "White"),
      );
    }
  }, [size, colors, form]);

  const hasWhite = Array.isArray(colors) && colors.includes("White");

  const getImages = () => {
    const images = [
      ...sizeBasedImages[size],
      ...commonImages,
      ...(hasWhite ? whiteImages : nonWhiteImages[size]),
    ];
    return images;
  };

  return (
    <div
      className={cn(
        "flex flex-col-reverse lg:flex-row h-full",
        isAnimating ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      <div className="lg:aspect-square w-full lg:w-1/2 relative lg:p-0 ">
        <Carousel className="lg:absolute lg:inset-0">
          <CarouselContent className="flex items-center pt-10 lg:pt-6 pb-10">
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
          {allImages.map((src, index) => (
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

      <div className="w-full lg:w-1/2 h-full flex flex-col mt-2 xs:mt-0">
        <Form {...form}>
          <form className="flex flex-col justify-center lg:px-6 py-0 xs:py-4">
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
              <div className="w-full max-w-96 lg:max-w-xl border shadow flex items-center text-xs py-1.5 justify-around text-green-900 font-semibold gap-1 xs:gap-2 mt-3 mb-6 xs:text-sm p-3 xs:px-1.5">
                <div className="flex items-center xs:gap-1.5 gap-0.5">
                  <MoveHorizontal className="w-4 h-4" />
                  <span>Width:</span>
                  <span className="whitespace-nowrap text-gray-900">30cm</span>
                </div>
                <div className="flex items-center xs:gap-1.5 gap-0.5">
                  <MoveVertical className="w-4 h-4" />
                  <span>Height:</span>
                  <span className="whitespace-nowrap text-gray-900">30cm</span>
                </div>
                <div className="flex items-center xs:gap-1.5 gap-0.5">
                  <Axis3D className="w-4 h-4" />
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
                      const imageSrc = {
                        Natural:
                          "/images/products/V8/details/Aaron set 3-42.jpg",
                        White: "/images/products/V8/details/Aaron set 3-40.jpg",
                        Black: "/images/products/V8/details/Aaron set 3-39.jpg",
                      }[color];

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
                          ((field.value as string[]).includes(color) ||
                            isLocked) &&
                          !isDisabled;
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
                                ? field.value.filter(c => c !== color)
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
