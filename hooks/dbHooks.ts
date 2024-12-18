// lib/db/base/hooks.ts
"use client";

import { useToastQueue } from "@/hooks/useToastQueue";
import { ActionResponse } from "@/types/action.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface HookOptions<T = unknown> {
  queryKey?: string[];
  errorMessage?: string;
  successMessage?: string;
  onSuccess?: (data: T | null) => void;
  onError?: (error: Error) => void;
  initialData?: T | null;
}

export function useDbQuery<T>(
  queryKey: string[],
  action: () => Promise<ActionResponse<T>>,
  options?: Omit<HookOptions<T>, "queryKey">,
) {
  return useQuery<T | null>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await action();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

export function useDbMutation<T, TVariables>(
  action: (variables: TVariables) => Promise<ActionResponse<T>>,
  {
    queryKey,
    errorMessage = "Operation failed",
    successMessage = "Operation successful",
    onSuccess,
    onError,
  }: Omit<HookOptions<T>, "initialData"> = {},
) {
  const queryClient = useQueryClient();
  const { toast } = useToastQueue();

  return useMutation<T | null, Error, TVariables>({
    mutationFn: async (variables) => {
      const { data, error } = await action(variables);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }
      toast({
        title: successMessage,
      });
      onSuccess?.(data);
    },
    onError: (error) => {
      toast({
        title: errorMessage,
        description: error.message,
      });
      onError?.(error);
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
  });
}
