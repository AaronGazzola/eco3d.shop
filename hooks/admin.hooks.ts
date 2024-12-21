// hooks/admin.hooks.ts
"use client";

import {
  getAdminNotificationsAction,
  updateAdminNotificationsAction,
} from "@/actions/admin.actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminNotificationsQuery = () => {
  return useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const response = await getAdminNotificationsAction();
      if (response.error) throw new Error(response.error.toString());
      return response.data;
    },
  });
};

export const useUpdateAdminNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await updateAdminNotificationsAction(enabled);
      if (response.error) throw new Error(response.error.toString());
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
  });
};
