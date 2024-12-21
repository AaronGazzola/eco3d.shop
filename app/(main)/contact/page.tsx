"use client";

import { sendContactEmail } from "@/actions/contact.actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ContactFormData, contactFormSchema } from "@/types/contact.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function ContactForm() {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      type: "bug_report",
      name: "",
      email: "",
      message: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: sendContactEmail,
    onSuccess: () => {
      toast.success("Message sent successfully");
      form.reset();
    },
    onError: () => toast.error("Failed to send message"),
  });

  return (
    <div className="w-full flex flex-col items-center border p-8">
      <div className="w-full space-y-6 mb-8">
        <h1 className="text-3xl font-bold text-center">Contact Us</h1>
        <p className="text-muted-foreground text-center">
          Have a question or concern? We&apos;re here to help.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => mutate(data))}
          className="space-y-6 w-full max-w-xl"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  defaultValue={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="bug_report">Bug Report</SelectItem>
                    <SelectItem value="returns">Returns</SelectItem>
                    <SelectItem value="product_inquiry">
                      Product Inquiry
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
