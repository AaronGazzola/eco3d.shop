"use client";

import {
  getAdminOrdersAction,
  getUserOrdersAction,
} from "@/actions/orderActions";
import { useDbQuery } from "@/hooks/dbHooks";
import { ActionResponse } from "@/types/action.types";
import { Order } from "@/types/order.types";

export const useUserOrdersQuery = () => {
  return useDbQuery<Order[]>(
    ["orders", "user"],
    async () => {
      const response = await getUserOrdersAction();
      return {
        data: response.data ?? [],
        error: response.error,
      } as ActionResponse<Order[]>;
    },
    {
      refetchInterval: 30000,
    },
  );
};

export const useAdminOrdersQuery = () => {
  return useDbQuery<(Order & { userEmail?: string })[]>(
    ["orders", "admin"],
    async () => {
      const response = await getAdminOrdersAction();
      return {
        data: response.data ?? [],
        error: response.error,
      } as ActionResponse<(Order & { userEmail?: string })[]>;
    },
    {
      refetchInterval: 30000,
    },
  );
};
