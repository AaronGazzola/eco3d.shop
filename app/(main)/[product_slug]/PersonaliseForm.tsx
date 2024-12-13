"use client";

import { Card } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useIsMounted from "@/hooks/useIsMounted";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const personaliseSchema = z.object({
  primaryMessage: z
    .string()
    .max(30, "Maximum 30 characters allowed")
    .regex(/^[^]*(\n[^]*){0,2}$/, "Maximum 3 lines allowed")
    .refine(
      value => value.split("\n").every(line => line.length <= 10),
      "Each line must be 10 characters or less",
    ),
  secondaryMessage: z
    .string()
    .max(10, "Maximum 10 characters allowed")
    .refine(
      value => !value.includes("\n"),
      "Secondary message must be a single line",
    ),
});

type FormValues = z.infer<typeof personaliseSchema>;

type ImageSize = "Small" | "Medium" | "Large";

const getImagesBySize = (size: ImageSize, hasWhite: boolean) => {
  if (size === "Small") {
    return {
      primary: "/images/products/V8/details/Aaron set 3-33.jpg",
      secondary: null,
    };
  }

  if (hasWhite) {
    return {
      primary: "/images/products/V8/details/Aaron set 3-31.jpg",
      secondary: "/images/products/V8/details/Aaron set 3-32.jpg",
    };
  }

  return {
    primary: "/images/products/V8/details/Aaron set 3-29.jpg",
    secondary: "/images/products/V8/details/Aaron set 3-30.jpg",
  };
};

const PersonaliseForm = ({ isAnimating }: { isAnimating: boolean }) => {
  const isMounted = useIsMounted();
  const [isInit, setIsInit] = useState(false);

  const [size] = useQueryState("size", {
    defaultValue: "Small",
    parse: (value: string | null): "Small" | "Medium" | "Large" =>
      ["Small", "Medium", "Large"].includes(value || "")
        ? (value as "Small" | "Medium" | "Large")
        : "Small",
  });

  const [colors] = useQueryState("colors", {
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

  const hasWhite = JSON.parse(colors).includes("White");
  const images = getImagesBySize(size as ImageSize, hasWhite);
  const isSmallSize = size === "Small";
  const isMediumSize = size === "Medium";
  const isLargeSize = size === "Large";
  const isWhiteColor = colors.includes("White");

  const [primaryParam, setPrimaryParam] = useQueryState("primary", {
    defaultValue: "",
    parse: (value: string | null) => value,
  });

  const [secondaryParam, setSecondaryParam] = useQueryState("secondary", {
    defaultValue: "",
    parse: (value: string | null) => value,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(personaliseSchema),
    defaultValues: {
      primaryMessage: primaryParam,
      secondaryMessage: secondaryParam,
    },
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "primaryMessage" && value.primaryMessage !== primaryParam) {
        setPrimaryParam(value.primaryMessage ?? "");
      }
      if (
        name === "secondaryMessage" &&
        value.secondaryMessage !== secondaryParam
      ) {
        setSecondaryParam(value.secondaryMessage ?? "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form, setPrimaryParam, setSecondaryParam, primaryParam, secondaryParam]);

  useEffect(() => {
    if (isMounted && !isInit) {
      setIsInit(true);
      setPrimaryParam(primaryParam);
      setSecondaryParam(secondaryParam);
    }
  }, [
    isMounted,
    setPrimaryParam,
    setSecondaryParam,
    primaryParam,
    secondaryParam,
    isInit,
  ]);

  useEffect(() => {
    form.reset({
      primaryMessage: primaryParam,
      secondaryMessage: secondaryParam,
    });
  }, [primaryParam, secondaryParam, form]);

  const handlePrimaryMessageChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const lines = e.target.value.split("\n");
    const truncatedLines = lines.map(line => line.slice(0, 10));
    const truncatedValue = truncatedLines.join("\n");
    form.setValue("primaryMessage", truncatedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const lines = e.currentTarget.value.split("\n");
    if (e.key === "Enter" && lines.length >= (isSmallSize ? 2 : 3)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (size === "Small" && form.getValues("primaryMessage")) {
      const lines = form.getValues("primaryMessage").split("\n").slice(0, 2);
      const truncatedValue = lines.join("\n");
      form.setValue("primaryMessage", truncatedValue);
      form.setValue("secondaryMessage", "");
    }
  }, [size, form]);

  return (
    <div
      className={cn(
        "w-full h-full",
        isAnimating ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      <Form {...form}>
        <form className="w-full h-full">
          <div className="w-full hidden lg:flex justify-center flex-row">
            <div className="w-full max-w-[450px] md:max-w-[400px] flex-shrink-0 flex flex-col aspect-square">
              <div className="w-full h-[66%]">
                <FormField
                  control={form.control}
                  name="primaryMessage"
                  render={({ field }) => (
                    <FormItem
                      className={cn(
                        "w-full p-2 mb-6",
                        isSmallSize ? "h-[140px]" : "h-[190px]",
                      )}
                    >
                      <FormLabel className="text-gray-800 mb-2 font-medium">
                        {isSmallSize
                          ? "Primary Message (2 lines, 10 characters each)"
                          : "Primary Message (3 lines, 10 characters each)"}
                      </FormLabel>
                      <Textarea
                        {...field}
                        onKeyDown={handleKeyDown}
                        onChange={handlePrimaryMessageChange}
                        className={cn(
                          "h-full text-center text-5xl text-gray-900 font-bold",
                          isSmallSize
                            ? "font-black"
                            : "font-['Snell_Roundhand']",
                        )}
                        placeholder={
                          isSmallSize
                            ? `To Grandpa,\nfrom Aaron`
                            : `Merry\nChristmas\nGrandpa!`
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {!isSmallSize && (
                <FormField
                  control={form.control}
                  name="secondaryMessage"
                  render={({ field }) => (
                    <FormItem className="w-full h-[80px] p-2">
                      <FormLabel className="text-gray-800 mb-2 font-medium">
                        Secondary Message (single line, 10 characters)
                      </FormLabel>
                      <Input
                        {...field}
                        className="h-full text-center text-4xl font-black text-gray-800 placeholder:text-gray-400 pb-2.5"
                        placeholder="From Aaron"
                        maxLength={10}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <div className="aspect-square w-full max-w-[450px] md:max-w-[400px] flex-shrink-0 flex flex-col">
              <div className="w-full h-[66%] p-2">
                <Card className="h-full w-full relative">
                  <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                    <div
                      className={cn(
                        "relative w-full aspect-square",
                        isWhiteColor &&
                          "scale-[160%] translate-y-3 translate-x-1.5",
                        !isWhiteColor &&
                          !isSmallSize &&
                          "scale-[115%] -translate-y-2 -translate-x-3",
                        isSmallSize &&
                          "scale-[180%] -translate-y-4 -translate-x-4",
                      )}
                    >
                      <Image
                        src={images.primary}
                        alt="Product preview with primary message"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                </Card>
              </div>
              {images.secondary && (
                <div className="w-full h-[33%] p-2">
                  <Card className="h-full w-full relative">
                    <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                      <div
                        className={cn(
                          "relative w-full aspect-square",
                          isWhiteColor
                            ? "scale-[170%] -translate-y-2"
                            : "scale-[160%] translate-y-10",
                        )}
                      >
                        <Image
                          src={images.secondary}
                          alt="Product preview with secondary message"
                          fill
                          className="object-cover"
                          priority
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>

          <div className="w-full flex flex-col items-center mb-3">
            <div className="h-full w-full flex flex-col items-center lg:hidden max-w-[500]">
              <FormField
                control={form.control}
                name="primaryMessage"
                render={({ field }) => (
                  <FormItem
                    className={cn(
                      "w-full p-2 mb-6",
                      isSmallSize ? "h-[135px]" : "h-[190px]",
                    )}
                  >
                    <FormLabel className="text-gray-800 mb-2 font-medium">
                      {isSmallSize
                        ? "Primary Message (2 lines, 10 characters each)"
                        : "Primary Message (3 lines, 10 characters each)"}
                    </FormLabel>
                    <Textarea
                      {...field}
                      onKeyDown={handleKeyDown}
                      onChange={handlePrimaryMessageChange}
                      className={cn(
                        "h-full text-center text-5xl text-gray-900 font-bold",
                        isSmallSize ? "font-black" : "font-['Snell_Roundhand']",
                      )}
                      placeholder={
                        isSmallSize
                          ? `To Grandpa,\nfrom Aaron`
                          : `Merry\nChristmas\nGrandpa!`
                      }
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="w-full h-[248px] p-2">
                <Card className="h-full w-full relative">
                  <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                    <div
                      className={cn(
                        "relative w-full aspect-square",
                        isWhiteColor &&
                          "scale-[140%] translate-y-3 translate-x-1.5",
                        !isWhiteColor &&
                          !isSmallSize &&
                          "scale-[115%] -translate-y-2 -translate-x-3",
                        isSmallSize &&
                          "scale-[160%] -translate-y-4 -translate-x-4",
                      )}
                    >
                      <Image
                        src={images.primary}
                        alt="Product preview with primary message"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                </Card>
              </div>
              {!isSmallSize && (
                <>
                  <FormField
                    control={form.control}
                    name="secondaryMessage"
                    render={({ field }) => (
                      <FormItem className="w-full h-[80px] mb-5 p-2 mt-6">
                        <FormLabel className="text-gray-800 mb-2 font-medium">
                          Secondary Message (single line, 10 characters)
                        </FormLabel>
                        <Input
                          {...field}
                          className="h-full text-center text-4xl font-black text-gray-800 placeholder:text-gray-400 pb-2.5"
                          placeholder="From Aaron"
                          maxLength={10}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {images.secondary && (
                    <div className="w-full h-[116px] p-2">
                      <Card className="h-full w-full relative">
                        <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                          <div
                            className={cn(
                              "relative w-full aspect-square ",
                              isWhiteColor && "scale-[140%] -translate-y-2",
                            )}
                          >
                            <Image
                              src={images.secondary}
                              alt="Product preview with secondary message"
                              fill
                              className="object-cover"
                              priority
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PersonaliseForm;
