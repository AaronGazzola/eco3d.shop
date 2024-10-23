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
import { useToastQueue } from "@/hooks/useToastQueue";

enum SuccessMessages {
  SIGN_IN_SUCCESS = "Sign in link sent! Check your email :)",
  UPDATE_USER_SUCCESS = "User updated successfully",
  DELETE_USER_SUCCESS = "User deleted successfully",
  SIGN_OUT_SUCCESS = "Sign out successful",
}

export const useGetUser = () => {
  return useQuery<User | null, Error>({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await getUserAction();
      return data?.user || null;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (user: Partial<User>) => {
      const { data } = await updateUserAction(user);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({ title: SuccessMessages.UPDATE_USER_SUCCESS });
    },
    onError: (error: Error) => {
      toast({
        title: error.message,
        description: "Failed to update user",
        open: true,
      });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await deleteUserAction(userId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({ title: SuccessMessages.DELETE_USER_SUCCESS });
    },
    onError: (error: Error) => {
      toast({
        title: error.message,
        description: "Failed to delete user",
        open: true,
      });
    },
  });
};

export const useSignInWithMagicLink = () => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await signInWithMagicLinkAction(email);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({ title: SuccessMessages.SIGN_IN_SUCCESS });
      console.log("test");
    },
    onError: (error: Error) => {
      toast({
        title: error.message,
        description: "Failed to sign in",
        open: true,
      });
    },
  });
};

export const useSignOut = () => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async () => {
      const data = await signOutAction();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({ title: SuccessMessages.SIGN_OUT_SUCCESS });
    },
    onError: (error: Error) => {
      toast({
        title: error.message,
        description: "Failed to sign out",
        open: true,
      });
    },
  });
};
