"use server";

import getActionResponse from "@/actions/getActionResponse";
import { ActionResponse } from "@/types/action.types";
import { Resend } from "resend";
import "server-only";

interface SendCustomEmailFormValues {
  email: string;
  subject: string;
  content: any;
}

const SMTP_API_KEY = process.env.SMTP_API_KEY;

/**
 * @name sendEmailAction
 * @description Sends a custom email using the Resend API
 */
async function sendEmailAction({
  email,
  subject,
  content,
}: SendCustomEmailFormValues): Promise<ActionResponse<null>> {
  const resend = new Resend(SMTP_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: `Eco3D.Shop <noreply@eco3d.shop>`,
      to: email,
      subject: subject,
      html: content,
    });

    if (error) {
      throw new Error(error.message || "Failed to send email");
    }

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
}

export default sendEmailAction;
