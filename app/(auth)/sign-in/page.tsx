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
import { useSignIn, useMagicLinkSignIn } from "./page.hooks";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const magicLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function SignInPage() {
  const [tab, setTab] = useState<"password" | "magic">("password");
  const signIn = useSignIn();
  const magicLinkSignIn = useMagicLinkSignIn();

  const passwordForm = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const magicForm = useForm({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  const onPasswordSubmit = (data: z.infer<typeof signInSchema>) => {
    signIn.mutate(data);
  };

  const onMagicSubmit = (data: z.infer<typeof magicLinkSchema>) => {
    magicLinkSignIn.mutate(data);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 text-center">Sign In</h2>

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

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-green-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={signIn.isPending}
            >
              {signIn.isPending ? "Signing in..." : "Sign In"}
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
              disabled={magicLinkSignIn.isPending}
            >
              {magicLinkSignIn.isPending ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link href="/sign-up" className="text-green-600 hover:underline font-medium">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
