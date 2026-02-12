"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPendingDesignsAction,
  approveDesignAction,
  rejectDesignAction,
} from "./page.actions";
import { CustomToast } from "@/components/CustomToast";

export function usePendingDesigns() {
  return useQuery({
    queryKey: ["pendingDesigns"],
    queryFn: () => getPendingDesignsAction(),
  });
}

export function useApproveDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ designId, feedback }: { designId: string; feedback?: string }) =>
      approveDesignAction(designId, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["featuredDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["publishedDesigns"] });
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Design approved"
          message="Design has been published to the gallery"
        />
      ));
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to approve"
          message={error.message}
        />
      ));
    },
  });
}

export function useRejectDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ designId, feedback }: { designId: string; feedback: string }) =>
      rejectDesignAction(designId, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Design rejected"
          message="Design has been rejected"
        />
      ));
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to reject"
          message={error.message}
        />
      ));
    },
  });
}
