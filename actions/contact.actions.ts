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
      from: "Eco3D Support <noreply@eco3d.shop>",
      to: process.env.CONTACT_EMAIL ?? "",
      subject: `New Contact Form Submission: ${parsed.type}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${parsed.name}</p>
        <p><strong>Email:</strong> ${parsed.email}</p>
        <p><strong>Type:</strong> ${parsed.type}</p>
        <p><strong>Message:</strong></p>
        <p>${parsed.message}</p>
      `,
      replyTo: parsed.email,
    });

    return getActionResponse();
  } catch (error) {
    console.log(
      `[ERROR] ${error instanceof Error ? error.message : JSON.stringify(error)}`,
    );
    return getActionResponse({ error });
  }
}
