"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateProfileAction } from "@/app/layout.actions";
import type { ProfileUpdate } from "@/app/layout.types";
import { CustomToast } from "@/components/CustomToast";
import { useAuthStore } from "@/app/layout.stores";

export function useCompleteProfile() {
  const queryClient = useQueryClient();
  const { setProfile } = useAuthStore();

  return useMutation({
    mutationFn: (updates: ProfileUpdate) => updateProfileAction(updates),
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Profile completed"
          message="Welcome to Eco3d.shop!"
        />
      ));
      window.location.href = "/";
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to update profile"
          message={error.message}
        />
      ));
    },
  });
}
