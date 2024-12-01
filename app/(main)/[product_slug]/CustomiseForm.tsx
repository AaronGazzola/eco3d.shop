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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Square, SquareCheckBig } from "lucide-react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";

const customiseSchema = z.object({
  size: z.enum(["small", "medium", "large"]),
  colors: z.array(z.string()).nonempty("At least one color must be selected."),
});

export function CustomiseForm() {
  const form = useForm({
    resolver: zodResolver(customiseSchema),
    defaultValues: {
      size: "medium",
      colors: [],
    },
  });

  const onSubmit = () => {};

  return (
    <div className="flex flex-col lg:flex-row lg:space-x-6 h-full overflow-y-auto">
      <Carousel className="w-auto h-full aspect-square min-w-[300px]">
        <CarouselContent className="flex items-center">
          {[...Array(3)].map((_, index) => (
            <CarouselItem
              key={index}
              className="flex items-center justify-center relative h-full w-full"
            >
              <CarouselPrevious className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow rounded-full p-2" />
              <CarouselNext className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow rounded-full p-2" />
              <Image
                className="rounded-lg shadow-lg"
                src="/images/promo/Aaron Set 1 Sept 20-19.jpg"
                alt="promo"
                width={500}
                height={500}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="relative overflow-hidden rounded-lg"></div>
      <div className="lg:w-1/2 w-full">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 p-4"
          >
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <div className="flex gap-4">
                    {["Small", "Medium", "Large"].map(size => {
                      const isActive = field.value === size;
                      return (
                        <Button
                          key={size}
                          type="button"
                          variant={isActive ? "secondary" : "outline"}
                          onClick={() => field.onChange(size)}
                          className="flex-1 gap-3 text-base group"
                        >
                          <div
                            className={cn(
                              "rounded-full w-5 h-5 border-2  flex items-center justify-center group-hover:border-white",
                              isActive ? "border-white" : "border-secondary ",
                            )}
                          >
                            <div
                              className={cn(
                                !isActive && "opacity-0",
                                "rounded-full w-1 h-1 bg-white",
                              )}
                            ></div>
                          </div>
                          {size}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="colors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colors</FormLabel>
                  <div className="flex gap-4">
                    {["Natural", "Black", "White"].map((color: string) => {
                      const isActive = (field.value as string[]).includes(
                        color,
                      );
                      return (
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
                          className={cn("flex-1 gap-3 text-base")}
                        >
                          {isActive ? (
                            <SquareCheckBig className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                          {color}
                        </Button>
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
