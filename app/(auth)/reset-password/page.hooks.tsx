"use client";

import { createClient } from "@/lib/supabase/browser-client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CustomToast } from "@/components/CustomToast";

export function useResetPassword() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error(error);
        throw new Error("Failed to reset password");
      }
    },
    onSuccess: () => {
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Password reset successful"
          message="You can now sign in with your new password"
        />
      ));
      window.location.href = "/sign-in";
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to reset password"
          message={error.message}
        />
      ));
    },
  });
}
