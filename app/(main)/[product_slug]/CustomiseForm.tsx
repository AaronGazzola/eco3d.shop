"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
        {/* Size */}
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

        {/* Colors */}
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
  );
}
