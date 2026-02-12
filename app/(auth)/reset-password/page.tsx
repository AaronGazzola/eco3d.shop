"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "./page.hooks";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const resetPassword = useResetPassword();

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: z.infer<typeof resetPasswordSchema>) => {
    resetPassword.mutate({ password: data.password });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2 text-center">Reset Password</h2>
      <p className="text-sm text-gray-600 mb-6 text-center">
        Enter your new password
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={resetPassword.isPending}
        >
          {resetPassword.isPending ? "Resetting..." : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}
