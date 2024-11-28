"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const personaliseSchema = z.object({
  topLeft: z.string().nonempty("This field is required."),
  topRight: z.array(z.string().min(1)),
  bottomLeft: z.string().nonempty("This field is required."),
  bottomRight: z.string().nonempty("This field is required."),
});

export function PersonaliseForm() {
  const form = useForm({
    resolver: zodResolver(personaliseSchema),
    defaultValues: {
      topLeft: "",
      topRight: ["", "", ""],
      bottomLeft: "",
      bottomRight: "",
    },
  });

  const onSubmit = () => {};

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-4 p-4"
      >
        {/* Top Left */}
        <FormField
          control={form.control}
          name="topLeft"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Top Left</FormLabel>
              <FormControl>
                <div className="border p-4 h-40">{/* Rectangular div */}</div>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Top Right */}
        <div className="space-y-4">
          {["Input 1", "Input 2", "Input 3"].map((label, idx) => (
            <FormField
              key={idx}
              control={form.control}
              name={`topRight.${idx}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>

        {/* Bottom Left */}
        <FormField
          control={form.control}
          name="bottomLeft"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bottom Left</FormLabel>
              <FormControl>
                <div className="border p-2 w-full">
                  {/* Full-width horizontal div */}
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Bottom Right */}
        <FormField
          control={form.control}
          name="bottomRight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bottom Right</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Next</Button>
      </form>
    </Form>
  );
}
