"use client";

import {
  getAdminOrdersAction,
  getUserOrdersAction,
  updateOrderTrackingAction,
} from "@/actions/orderActions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useUserOrdersQuery = () => {
  return useQuery({
    queryKey: ["orders", "user"],
    queryFn: async () => {
      const response = await getUserOrdersAction();
      if (response.error) throw new Error(response.error.toString());
      if (!response.data) return [];
      return response.data;
    },
    refetchInterval: 30000,
  });
};

export const useAdminOrdersQuery = () => {
  return useQuery({
    queryKey: ["orders", "admin"],
    queryFn: async () => {
      const response = await getAdminOrdersAction();
      if (response.error) throw new Error(response.error.toString());
      if (!response.data) return [];
      return response.data;
    },
    refetchInterval: 30000,
  });
};

export const useUpdateTrackingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      trackingNumber,
    }: {
      orderId: string;
      trackingNumber: string;
    }) => {
      const response = await updateOrderTrackingAction(orderId, trackingNumber);
      if (response.error) throw new Error(response.error.toString());
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};
