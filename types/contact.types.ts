import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  type: z
    .enum(["bug_report", "returns", "product_inquiry", "other"])
    .default("bug_report"),
  message: z.string().min(10),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
