"use server";

import { createClient } from "@/lib/supabase/server-client";

export async function submitContactAction(formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("contact_submissions").insert({
    name: formData.name,
    email: formData.email,
    subject: formData.subject,
    message: formData.message,
    status: "unread",
  });

  if (error) {
    console.error(error);
    throw new Error("Failed to submit contact form");
  }
}
