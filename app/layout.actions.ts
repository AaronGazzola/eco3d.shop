"use server";

import { createClient } from "@/lib/supabase/server-client";
import type { ProfileUpdate } from "./layout.types";

export async function getCurrentProfileAction() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error(error);
    throw new Error("Failed to fetch profile");
  }

  return profile;
}

export async function updateProfileAction(updates: ProfileUpdate) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Failed to update profile");
  }

  return profile;
}

export async function checkIsAdminAction() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return false;
  }

  return profile.role === "admin" || profile.role === "super-admin";
}
