"use client";

import { createClient } from "@/lib/supabase/browser-client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CustomToast } from "@/components/CustomToast";

export function useSignUp() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/welcome`,
        },
      });

      if (error) {
        console.error(error);
        if (error.status === 400 && error.message.includes("already registered")) {
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
          });

          if (resendError) {
            console.error(resendError);
            throw new Error("User already exists. Failed to resend verification email");
          }

          return { needsVerification: true };
        }
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      if ("needsVerification" in data) {
        toast.custom(() => (
          <CustomToast
            variant="notification"
            title="Verification email resent"
            message="Please check your email to verify your account"
          />
        ));
      } else {
        toast.custom(() => (
          <CustomToast
            variant="success"
            title="Account created"
            message="Please check your email to verify your account"
          />
        ));
      }
      window.location.href = "/verify";
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Sign up failed"
          message={error.message}
        />
      ));
    },
  });
}

export function useMagicLinkSignUp() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/welcome`,
        },
      });

      if (error) {
        console.error(error);
        throw new Error("Failed to send magic link");
      }
    },
    onSuccess: () => {
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Magic link sent"
          message="Check your email to complete sign up"
        />
      ));
      window.location.href = "/verify";
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to send magic link"
          message={error.message}
        />
      ));
    },
  });
}
