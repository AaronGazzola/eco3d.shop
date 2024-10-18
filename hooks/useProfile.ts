"use client";
import {
  deleteProfileAction,
  getProfileAction,
  updateProfileAction,
  upsertProfileAction,
} from "@/actions/profileActions";
import { Tables } from "@/types/database.types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Profile = Tables<"profiles">;

// Hook to fetch profile data (public.profiles)
export const useGetProfile = () => {
  return useQuery<Profile | null, Error>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await getProfileAction();
      return data || null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook to update profile (public.profiles)
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Partial<Profile>) => {
      const { data } = await updateProfileAction(profile);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

// Hook to delete profile (public.profiles)
export const useDeleteProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      const { data } = await deleteProfileAction(profileId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

// Hook to upsert profile (public.profiles)
export const useUpsertProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Partial<Profile>) => {
      const { data } = await upsertProfileAction(profile);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};
