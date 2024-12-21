"use server";

import getActionResponse from "@/actions/getActionResponse";
import { ActionResponse } from "@/types/action.types";
import { ContactFormData, contactFormSchema } from "@/types/contact.types";
import { Resend } from "resend";

export async function sendContactEmail(
  data: ContactFormData,
): Promise<ActionResponse<null>> {
  const resend = new Resend(process.env.SMTP_API_KEY);

  try {
    const parsed = contactFormSchema.parse(data);

    const emailResponse = await resend.emails.send({
      from: "Eco3D.Shop <noreply@eco3d.shop>",
      to: "aaron@gazzola.dev",
      subject: `New Contact Form Submission: ${parsed.type}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${parsed.name}</p>
        <p><strong>Email:</strong> ${parsed.email}</p>
        <p><strong>Type:</strong> ${parsed.type}</p>
        <p><strong>Message:</strong></p>
        <p>${parsed.message}</p>
      `,
    });

    if (emailResponse.error) {
      throw new Error(emailResponse.error.message || "Failed to send email");
    }

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
}
