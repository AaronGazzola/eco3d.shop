"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "./page.hooks";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (data: z.infer<typeof forgotPasswordSchema>) => {
    forgotPassword.mutate(data, {
      onSuccess: () => {
        setSubmitted(true);
      },
    });
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="mb-6">
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
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
          <p className="text-gray-600">
            We've sent you a password reset link. Please check your inbox.
          </p>
        </div>

        <Link href="/sign-in">
          <Button variant="outline" className="w-full">
            Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2 text-center">Forgot Password</h2>
      <p className="text-sm text-gray-600 mb-6 text-center">
        Enter your email and we'll send you a reset link
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={forgotPassword.isPending}
        >
          {forgotPassword.isPending ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Remember your password?{" "}
        <Link href="/sign-in" className="text-green-600 hover:underline font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
}
