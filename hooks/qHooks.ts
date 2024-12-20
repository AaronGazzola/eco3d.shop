"use client";

import {
  getQueueItemsAction,
  updatePrintQueueItemStatusAction,
  UpdateStatusParams,
} from "@/actions/qActions";
import { QueueItemResponse } from "@/types/q.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const PRINT_QUEUE_ITEMS_KEY = (queueId: string) =>
  ["print-queue-items", queueId] as const;

export function useUpdatePrintQueueItemStatus(itemId: string, queueId: string) {
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
      queryClient.invalidateQueries({
        queryKey: PRINT_QUEUE_ITEMS_KEY(queueId),
      });
    },
  });
}

export function useQueueItems(queueId: string) {
  return useQuery({
    queryKey: PRINT_QUEUE_ITEMS_KEY(queueId),
    queryFn: async () => {
      const { data, error } = await getQueueItemsAction(queueId);
      if (error) throw new Error(error);
      return data as QueueItemResponse[] | null;
    },
  });
}
