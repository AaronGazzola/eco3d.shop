import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type { ToastActionElement } from "@/components/ui/toast";

const TOAST_QUERY_KEY = ["toasts"];
const TOAST_LIMIT = 3;

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const initialToastState: ToasterToast[] = [];

function genId() {
  return `${Date.now()}-${Math.random()}`;
}

export function useToastQueue() {
  const queryClient = useQueryClient();

  const { data: toasts = initialToastState } = useQuery({
    queryKey: TOAST_QUERY_KEY,
    initialData: () => initialToastState,
    staleTime: Infinity,
  });

  const addToastMutation = useMutation({
    mutationFn: (toast: ToasterToast) => {
      return Promise.resolve([...toasts, toast].slice(0, TOAST_LIMIT));
    },
    onMutate: newToast => {
      queryClient.setQueryData(
        TOAST_QUERY_KEY,
        (oldToasts: ToasterToast[] | undefined) => {
          return [newToast, ...(oldToasts || [])].slice(0, TOAST_LIMIT);
        },
      );
    },
  });

  const dismissToastMutation = useMutation({
    mutationFn: (toastId: string) => {
      return Promise.resolve(
        toasts.map(t => (t.id === toastId ? { ...t, open: false } : t)),
      );
    },
    onMutate: toastId => {
      queryClient.setQueryData(
        TOAST_QUERY_KEY,
        (oldToasts: ToasterToast[] | undefined) =>
          oldToasts?.map(t => (t.id === toastId ? { ...t, open: false } : t)),
      );
    },
  });

  const toast = (props: Omit<ToasterToast, "id">) => {
    const id = genId();
    const newToast: ToasterToast = {
      ...props,
      id,
      open: true,
      onOpenChange: open => {
        if (!open) dismiss(id);
      },
    };
    addToastMutation.mutate(newToast);
    return {
      id,
      dismiss: () => dismiss(id),
      update: (updatedProps: Partial<ToasterToast>) => {
        queryClient.setQueryData(
          TOAST_QUERY_KEY,
          (oldToasts: ToasterToast[] | undefined) =>
            oldToasts?.map(toast =>
              toast.id === id ? { ...toast, ...updatedProps } : toast,
            ),
        );
      },
    };
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      dismissToastMutation.mutate(toastId);
    } else {
      toasts.forEach(t => dismiss(t.id));
    }
  };

  return {
    toasts,
    toast,
    dismiss,
  };
}
