"use client";
import {
  deleteUserAction,
  getUserAction,
  getUserRoleAction,
  signOutAction,
  updateUserAction,
} from "@/actions/userActions";
import useSupabase from "@/hooks/useSupabase";
import { useToastQueue } from "@/hooks/useToastQueue";
import { ActionResponse } from "@/types/action.types";
import { Tables } from "@/types/database.types";
import { HookOptions } from "@/types/db.types";
import { User } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

enum SuccessMessages {
  SIGN_IN_SUCCESS = "Sign in link sent! Check your email :)",
  UPDATE_USER_SUCCESS = "User updated successfully",
  DELETE_USER_SUCCESS = "User deleted successfully",
  SIGN_OUT_SUCCESS = "Sign out successful",
}

export const useGetUser = ({ initialData }: HookOptions<User> = {}) => {
  return useQuery<User | null, Error>({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await getUserAction();
      return data?.user || null;
    },
    staleTime: 1000 * 60 * 5,
    initialData,
  });
};

export const useUpdateUser = ({
  errorMessage,
  successMessage,
}: HookOptions<User> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (
      user: Partial<User>,
      hookOptions?: HookOptions<User>,
    ) => {
      const { data } = await updateUserAction(user);
      return data;
    },
    onSuccess: (data, variables, context, hookOptions?: HookOptions<User>) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title:
          hookOptions?.successMessage ||
          successMessage ||
          SuccessMessages.UPDATE_USER_SUCCESS,
      });
    },
    onError: (
      error: Error,
      variables,
      context,
      hookOptions?: HookOptions<User>,
    ) => {
      toast({
        title: hookOptions?.errorMessage || errorMessage || error.message,
        description: "Failed to update user",
        open: true,
      });
    },
  });
};

export const useDeleteUser = ({
  errorMessage,
  successMessage,
}: HookOptions<User> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation({
    mutationFn: async (userId: string, hookOptions?: HookOptions<User>) => {
      const { data } = await deleteUserAction(userId);
      return data;
    },
    onSuccess: (data, variables, context, hookOptions?: HookOptions<User>) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title:
          hookOptions?.successMessage ||
          successMessage ||
          SuccessMessages.DELETE_USER_SUCCESS,
      });
    },
    onError: (
      error: Error,
      variables,
      context,
      hookOptions?: HookOptions<User>,
    ) => {
      toast({
        title: hookOptions?.errorMessage || errorMessage || error.message,
        description: "Failed to delete user",
        open: true,
      });
    },
  });
};

export const useSignInWithMagicLink = ({
  errorMessage,
  successMessage,
}: HookOptions<User> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async (email: string, hookOptions?: HookOptions<User>) => {
      const { data, error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables, context, hookOptions?: HookOptions<User>) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title:
          hookOptions?.successMessage ||
          successMessage ||
          SuccessMessages.SIGN_IN_SUCCESS,
      });
    },
    onError: (
      error: Error,
      variables,
      context,
      hookOptions?: HookOptions<User>,
    ) => {
      toast({
        title: hookOptions?.errorMessage || errorMessage || error.message,
        description: "Failed to sign in",
        open: true,
      });
    },
  });
};

export const useSignOut = ({
  errorMessage,
  successMessage,
}: HookOptions<User> = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  const hook = useMutation<
    ActionResponse<null>,
    Error,
    HookOptions<User> | undefined
  >({
    mutationFn: async (hookOptions?: HookOptions<User>) => {
      const data = await signOutAction();
      return data;
    },
    onSuccess: (data, variables, context) => {
      const options = variables ?? {};
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title:
          options.successMessage ||
          successMessage ||
          SuccessMessages.SIGN_OUT_SUCCESS,
      });
    },
    onError: (error: Error, variables, context) => {
      const options = variables ?? {};
      toast({
        title: options.errorMessage || errorMessage || error.message,
        description: "Failed to sign out",
        open: true,
      });
    },
  });
  return {
    ...hook,
    mutate: (HookOptions?: HookOptions<User>) => hook.mutate(HookOptions),
  };
};

export const useGetUserRole = ({
  initialData,
}: HookOptions<Tables<"user_roles">> = {}) => {
  return useQuery<Tables<"user_roles"> | null, Error>({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data, error } = await getUserRoleAction();
      if (error) throw new Error(error);
      return data || null;
    },
    staleTime: 1000 * 60 * 5,
    initialData,
  });
};

export const useIsAdmin = () => {
  const { data } = useGetUserRole();
  return data?.role === "admin" || false;
};
