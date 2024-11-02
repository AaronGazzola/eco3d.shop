"use server";

import getActionResponse from "@/actions/getActionResponse";
import getSupabaseServerActionClient from "@/clients/action-client";

// Get user action (auth.users)
export const getUserAction = async () => {
  const supabase = await getSupabaseServerActionClient();
  try {
    const { data: userData, error } = await supabase.auth.getUser();

    if (error) throw new Error(error.message);

    return getActionResponse({ data: userData });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Update user action (auth.users)
export const updateUserAction = async (user: {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
}) => {
  const supabase = await getSupabaseServerActionClient();

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) throw new Error("User not found");

    // Update user details using the auth API
    const { data, error } = await supabase.auth.updateUser({
      email: user.email,
      password: user.password,
      data: { first_name: user.first_name, last_name: user.last_name }, // Metadata update
    });

    if (error) throw new Error(error.message);

    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Delete user action (auth.users)
export const deleteUserAction = async (userId: string) => {
  const supabase = await getSupabaseServerActionClient();
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw new Error(error.message);

    return getActionResponse({ data: `User ${userId} deleted successfully` });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Upsert user action (auth.users)
export const upsertUserAction = async (user: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}) => {
  const supabase = await getSupabaseServerActionClient();

  try {
    const { data: userData } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          first_name: user.first_name,
          last_name: user.last_name,
        },
      },
    });

    if (!userData.user) throw new Error("User sign-up failed");

    return getActionResponse({ data: userData });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Action to sign in with magic link
export const signInWithMagicLinkAction = async (email: string) => {
  const supabase = await getSupabaseServerActionClient();

  try {
    const { data, error } = await supabase.auth.signInWithOtp({ email });

    if (error) throw new Error(error.message);

    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Action to sign out
export const signOutAction = async () => {
  const supabase = await getSupabaseServerActionClient();

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

// Get user role action (auth.users)
export const getUserRoleAction = async () => {
  const supabase = await getSupabaseServerActionClient();
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(userError.message);

    const userId = userData.user?.id;
    if (!userId) throw new Error("User not found");

    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);

    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getUserIsAdminAction = async () => {
  try {
    const { data, error } = await getUserRoleAction();
    if (error) throw new Error(error);
    return getActionResponse({ data: data?.role === "admin" });
  } catch (error) {
    return getActionResponse({ error });
  }
};
