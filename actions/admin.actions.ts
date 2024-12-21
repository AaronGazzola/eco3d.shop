"use server";

import getActionResponse from "@/actions/getActionResponse";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";

export const getAdminNotificationsAction = async (): Promise<
  ActionResponse<boolean>
> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) throw new Error("Admin not found");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("order_notifications")
      .eq("user_id", session.user.id)
      .single();

    if (error) throw error;

    return getActionResponse({ data: !!profile?.order_notifications });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateAdminNotificationsAction = async (
  enabled: boolean,
): Promise<ActionResponse<boolean>> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) throw new Error("Admin not found");

    const { error } = await supabase
      .from("profiles")
      .update({ order_notifications: enabled })
      .eq("user_id", session.user.id);

    if (error) throw error;

    return getActionResponse({ data: true });
  } catch (error) {
    return getActionResponse({ error });
  }
};
