"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSignUp, useMagicLinkSignUp } from "./page.hooks";

const signUpSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const magicLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function SignUpPage() {
  const [tab, setTab] = useState<"password" | "magic">("password");
  const signUp = useSignUp();
  const magicLinkSignUp = useMagicLinkSignUp();

  const passwordForm = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const magicForm = useForm({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  const onPasswordSubmit = (data: z.infer<typeof signUpSchema>) => {
    signUp.mutate({ email: data.email, password: data.password });
  };

  const onMagicSubmit = (data: z.infer<typeof magicLinkSchema>) => {
    magicLinkSignUp.mutate(data);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 text-center">Sign Up</h2>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "password" | "magic")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">Email & Password</TabsTrigger>
          <TabsTrigger value="magic">Magic Link</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="mt-6">
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...passwordForm.register("email")}
              />
              {passwordForm.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {passwordForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...passwordForm.register("password")}
              />
              {passwordForm.formState.errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...passwordForm.register("confirmPassword")}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={signUp.isPending}
            >
              {signUp.isPending ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="magic" className="mt-6">
          <form onSubmit={magicForm.handleSubmit(onMagicSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="magic-email">Email</Label>
              <Input
                id="magic-email"
                type="email"
                placeholder="you@example.com"
                {...magicForm.register("email")}
              />
              {magicForm.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {magicForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={magicLinkSignUp.isPending}
            >
              {magicLinkSignUp.isPending ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-green-600 hover:underline font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
}
