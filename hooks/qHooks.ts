"use client";

import {
  updatePrintQueueItemStatusAction,
  UpdateStatusParams,
} from "@/actions/qActions";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdatePrintQueueItemStatus(itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, status }: UpdateStatusParams) => {
      const { data, error } = await updatePrintQueueItemStatusAction({
        itemId,
        status,
      });
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-queue-items"] });
    },
  });
}
