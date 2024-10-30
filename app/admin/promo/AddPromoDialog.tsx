"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ActionButton from "@/components/layout/ActionButton";
import { useCreatePromoCodeAndKey } from "@/hooks/promoHooks";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  promoKey: z.string().min(2, {
    message: "Promo Key must be at least 2 characters.",
  }),
  promoCode: z.string().min(1, {
    message: "Promo Code cannot be empty.",
  }),
  discountPercent: z
    .string()
    .min(1, {
      message: "Discount must be at least 1%.",
    })
    .transform((value) => parseFloat(value))
    .refine((value) => value >= 1 && value <= 50, {
      message: "Discount must be between 1 and 50.",
    }),
  expirationDate: z.date().refine((date) => date >= new Date(), {
    message: "Expiration date must be in the future.",
  }),
});

const AddPromoDialog = () => {
  const { mutate: createPromoCodeAndKey, isPending } =
    useCreatePromoCodeAndKey();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      promoKey: "",
      promoCode: "",
      discountPercent: undefined,
      expirationDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      ),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createPromoCodeAndKey({
      code: values.promoCode,
      key: values.promoKey,
      discountPercentage: values.discountPercent,
      expirationDate: values.expirationDate.toISOString(),
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="promoKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Promo Key</FormLabel>
              <FormControl>
                <Input
                  placeholder="123456"
                  {...field}
                />
              </FormControl>
              <FormDescription>Code displayed on promo items</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="promoCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Promo Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="3DYAY"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Unique code used to apply discount
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discountPercent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount Percent</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Percent(1-50)"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the discount up to 50% off.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expirationDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expiration Date</FormLabel>
              <FormControl>
                <Popover modal>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => field.onChange(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormDescription>
                Select the expiration date for the promo code.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <ActionButton isPending={isPending}>Submit</ActionButton>
      </form>
    </Form>
  );
};

export default AddPromoDialog;
