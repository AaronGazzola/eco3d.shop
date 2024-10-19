"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@supabase/supabase-js";
import {
  getUserAction,
  updateUserAction,
  deleteUserAction,
  signOutAction,
  signInWithMagicLinkAction,
} from "@/actions/userActions";

// Hook to fetch user data (auth.users)
export const useGetUser = () => {
  return useQuery<User | null, Error>({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await getUserAction();
      return data?.user || null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook to update user data (auth.users)
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Partial<User>) => {
      const { data } = await updateUserAction(user);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

// Hook to delete user (auth.users)
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await deleteUserAction(userId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};
// Hook to sign in with magic link
export const useSignInWithMagicLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const data = await signInWithMagicLinkAction(email);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

// Hook to sign out
export const useSignOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const data = await signOutAction();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};
