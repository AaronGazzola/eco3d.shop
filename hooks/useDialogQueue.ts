"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

const DIALOG_QUERY_KEY = ["dialogs"];

type Dialog = {
  id: string;
  component: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

const initialDialogState: Dialog[] = [];

function genId() {
  return `${Date.now()}-${Math.random()}`;
}

export function useDialogQueue() {
  const queryClient = useQueryClient();

  const { data: dialogs = initialDialogState } = useQuery({
    queryKey: DIALOG_QUERY_KEY,
    initialData: () => initialDialogState,
    staleTime: Infinity,
  });

  const addDialogMutation = useMutation({
    mutationFn: (dialog: Dialog) => {
      return Promise.resolve([...dialogs, dialog]);
    },
    onMutate: newDialog => {
      queryClient.setQueryData(
        DIALOG_QUERY_KEY,
        (oldDialogs: Dialog[] | undefined) => {
          return [newDialog, ...(oldDialogs || [])];
        },
      );
    },
  });

  const dismissDialogMutation = useMutation({
    mutationFn: () => {
      return Promise.resolve(
        dialogs.map((d, index) => (index === 0 ? { ...d, open: false } : d)),
      );
    },
    onMutate: () => {
      queryClient.setQueryData(
        DIALOG_QUERY_KEY,
        (oldDialogs: Dialog[] | undefined) =>
          oldDialogs?.map((d, index) =>
            index === 0 ? { ...d, open: false } : d,
          ),
      );
    },
  });

  const dialog = (component: Omit<Dialog, "id">["component"]) => {
    const id = genId();
    const newDialog: Dialog = {
      open: true,
      component,
      id,
      onOpenChange: open => {
        if (!open) dismiss();
      },
    };
    addDialogMutation.mutate(newDialog);
    return {
      id,
      dismiss: () => dismiss(),
      update: (updatedProps: Partial<Dialog>) => {
        queryClient.setQueryData(
          DIALOG_QUERY_KEY,
          (oldDialogs: Dialog[] | undefined) =>
            oldDialogs?.map(dialog =>
              dialog.id === id ? { ...dialog, ...updatedProps } : dialog,
            ),
        );
      },
    };
  };

  const dismiss = () => {
    dismissDialogMutation.mutate();
  };

  return {
    dialogs,
    dialog,
    dismiss,
  };
}
