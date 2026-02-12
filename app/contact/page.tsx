"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitContact } from "./page.hooks";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const submitContact = useSubmitContact();

  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = (data: z.infer<typeof contactSchema>) => {
    submitContact.mutate(data, {
      onSuccess: () => {
        setSubmitted(true);
        form.reset();
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            ← Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">Contact Us</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Message Sent!
                </h2>
                <p className="text-gray-600 mb-4">
                  Thank you for contacting us. We'll get back to you soon.
                </p>
                <Button onClick={() => setSubmitted(false)}>
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="How can we help?"
                    {...form.register("subject")}
                  />
                  {form.formState.errors.subject && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.subject.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Your message..."
                    rows={6}
                    {...form.register("message")}
                  />
                  {form.formState.errors.message && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.message.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitContact.isPending}
                >
                  {submitContact.isPending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Get in Touch
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
                <p className="text-gray-600">support@eco3d.shop</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                <p className="text-gray-600">
                  123 Eco Street
                  <br />
                  Green City, EC 12345
                  <br />
                  United States
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Business Hours
                </h3>
                <p className="text-gray-600">
                  Monday - Friday: 9:00 AM - 5:00 PM
                  <br />
                  Saturday - Sunday: Closed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
