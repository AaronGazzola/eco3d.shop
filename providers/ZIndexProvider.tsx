"use client";
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "@/components/ui/toast";
import { useToastQueue } from "@/hooks/useToastQueue";
import { ReactNode } from "react";
import { useDialogQueue } from "@/hooks/useDialogQueue";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const ZIndexProvider = ({ children }: { children: ReactNode }) => {
  const { toasts, dismiss: dismissToast } = useToastQueue();
  const { dialogs } = useDialogQueue();

  return (
    <>
      <ToastProvider>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            open={toast.open}
            onOpenChange={() => dismissToast(toast.id)}
          >
            <div>
              <ToastTitle>{toast.title}</ToastTitle>
              {toast.description && (
                <ToastDescription>{toast.description}</ToastDescription>
              )}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>

      {dialogs.map((dialog) => (
        <Dialog
          key={dialog.id}
          open={dialog.open}
          onOpenChange={(open) => dialog.onOpenChange?.(open)}
        >
          <DialogContent>{dialog.component}</DialogContent>
        </Dialog>
      ))}
      {children}
    </>
  );
};
