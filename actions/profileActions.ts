"use server";

import getActionResponse from "@/actions/getActionResponse";
import getSupabaseServerActionClient from "@/clients/action-client";

// Get profile action (public.profiles)
export const getProfileAction = async () => {
  const supabase = getSupabaseServerActionClient();
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) throw new Error("User not found");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw new Error(error.message);

    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Update profile action (public.profiles)
export const updateProfileAction = async (profile: Partial<Profile>) => {
  const supabase = getSupabaseServerActionClient();
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) throw new Error("User not found");

    const { data, error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", userId)
      .single();

    if (error) throw new Error(error.message);

    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Delete profile action (public.profiles)
export const deleteProfileAction = async (profileId: string) => {
  const supabase = getSupabaseServerActionClient();
  try {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (error) throw new Error(error.message);

    return getActionResponse({
      data: `Profile ${profileId} deleted successfully`,
    });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Upsert profile action (public.profiles)
export const upsertProfileAction = async (profile: Partial<Profile>) => {
  const supabase = getSupabaseServerActionClient();
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) throw new Error("User not found");

    const { data, error } = await supabase
      .from("profiles")
      .upsert({ ...profile, id: userId })
      .eq("id", userId)
      .single();

    if (error) throw new Error(error.message);

    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};
