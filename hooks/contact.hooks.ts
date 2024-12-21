"use client";

import { sendContactEmail } from "@/actions/contact.actions";
import { useToastQueue } from "@/hooks/useToastQueue";
import { ContactFormData } from "@/types/contact.types";
import { useMutation } from "@tanstack/react-query";

export function useContactForm() {
  const { toast } = useToastQueue();
  return useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await sendContactEmail(data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
      });
    },
    onError: (error) => {
      toast({ title: error?.message || "Failed to send message" });
    },
  });
}
