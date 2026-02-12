"use client";

import { createClient } from "@/lib/supabase/browser-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCurrentProfileAction, updateProfileAction } from "./layout.actions";
import { useAuthStore } from "./layout.stores";
import type { ProfileUpdate } from "./layout.types";
import { CustomToast } from "@/components/CustomToast";

export function useAuth() {
  const supabase = createClient();
  const { setUser, setProfile, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      setLoading(true);

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return null;
        }

        setUser(user);

        if (user) {
          const profile = await getCurrentProfileAction();
          setProfile(profile);
        } else {
          setProfile(null);
        }

        setLoading(false);
        return user;
      } catch (error) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateProfile() {
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
          title="Profile updated"
          message="Your profile has been updated successfully"
        />
      ));
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Update failed"
          message={error.message}
        />
      ));
    },
  });
}
