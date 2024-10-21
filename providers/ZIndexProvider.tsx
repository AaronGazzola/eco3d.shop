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

export const ZIndexProvider = ({ children }: { children: ReactNode }) => {
  const { toasts, dismiss } = useToastQueue();

  return (
    <>
      <ToastProvider>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            open={toast.open}
            onOpenChange={() => dismiss(toast.id)}
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
      {children}
    </>
  );
};
