"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
});

const AddPromoDialog = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      promoKey: "",
      promoCode: "",
      discountPercent: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
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

        <ActionButton>Submit</ActionButton>
      </form>
    </Form>
  );
};

export default AddPromoDialog;
