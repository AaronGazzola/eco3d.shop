"use client";

import {
  getCartTimeAction,
  getQueueItemsAction,
  updatePrintQueueItemStatusAction,
  UpdateStatusParams,
} from "@/actions/qActions";
import { CartItem } from "@/types/cart.types";
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

export const useCartQTime = (items: CartItem[], isEnabled = false) => {
  return useQuery({
    queryKey: ["variant_ids_by_attributes", items],
    queryFn: async () => {
      const { data, error } = await getCartTimeAction(items);
      if (error) throw new Error(error);
      return data;
    },
    enabled: items.length > 0 && isEnabled,
  });
};
