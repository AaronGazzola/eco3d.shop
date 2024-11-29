"use client";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { zodResolver } from "@hookform/resolvers/zod";
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
              className="flex items-center justify-center relative h-full w-full "
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
                  <RadioGroup {...field} className="flex gap-4">
                    {["small", "medium", "large"].map(size => (
                      <RadioGroupItem key={size} value={size}>
                        {size}
                      </RadioGroupItem>
                    ))}
                  </RadioGroup>
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
                    {["natural", "black", "white"].map(color => (
                      <Checkbox
                        key={color}
                        value={color}
                        onCheckedChange={checked =>
                          checked
                            ? field.onChange([...field.value, color])
                            : field.onChange(
                                field.value.filter(item => item !== color),
                              )
                        }
                      >
                        {color}
                      </Checkbox>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Next</Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
