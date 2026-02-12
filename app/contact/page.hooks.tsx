"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { submitContactAction } from "./page.actions";
import type { ContactFormData } from "./page.types";
import { CustomToast } from "@/components/CustomToast";

export function useSubmitContact() {
  return useMutation({
    mutationFn: (formData: ContactFormData) => submitContactAction(formData),
    onSuccess: () => {
      toast.custom(() => (
        <CustomToast
          variant="success"
          title="Message sent"
          message="We'll get back to you soon!"
        />
      ));
    },
    onError: (error) => {
      toast.custom(() => (
        <CustomToast
          variant="error"
          title="Failed to send message"
          message={error.message}
        />
      ));
    },
  });
}
