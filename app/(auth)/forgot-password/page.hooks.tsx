"use client";

import { createClient } from "@/lib/supabase/browser-client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CustomToast } from "@/components/CustomToast";

export function useForgotPassword() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error(error);
        throw new Error("Failed to send reset email");
      }
    },
    onSuccess: () => {
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Reset email sent"
          message="Check your email for the password reset link"
        />
      ));
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to send reset email"
          message={error.message}
        />
      ));
    },
  });
}
