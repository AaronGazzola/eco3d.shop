"use server";

import getActionResponse from "@/actions/getActionResponse";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";

const NOTIFICATIONS_KEY = "order_notifications";

type NotificationSettings = {
  enabled: boolean;
  emails: string[];
};

export const getAdminNotificationsAction = async (): Promise<
  ActionResponse<NotificationSettings>
> => {
  try {
    const supabase = await getSupabaseServerActionClient();
    console.log("[GET] Fetching notifications settings");

    const { data: setting, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", NOTIFICATIONS_KEY)
      .single();

    if (error) throw error;
    console.log("[GET] Settings data:", setting);

    const typedValue = setting.value as NotificationSettings;
    return getActionResponse({ data: typedValue });
  } catch (error) {
    console.log("[GET] Error fetching settings:", error);
    return getActionResponse({ error });
  }
};

export const updateAdminNotificationsAction = async (
  enabled: boolean,
): Promise<ActionResponse<boolean>> => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { data: setting, error: fetchError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", NOTIFICATIONS_KEY)
      .single();

    if (fetchError) throw fetchError;
    if (!setting) throw new Error("Notification settings not found");

    const currentValue = setting.value as NotificationSettings;
    const { error: updateError } = await supabase
      .from("system_settings")
      .update({
        value: {
          enabled,
          emails: currentValue.emails,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("key", NOTIFICATIONS_KEY);

    if (updateError) throw updateError;

    return getActionResponse({ data: true });
  } catch (error) {
    return getActionResponse({ error });
  }
};
