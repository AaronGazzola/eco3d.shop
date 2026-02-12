"use server";

import { createClient } from "@/lib/supabase/server-client";
import type { ProjectInsert } from "@/app/layout.types";

export async function getMyProjectsAction() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      published:published_designs(*)
    `)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    throw new Error("Failed to fetch projects");
  }

  return data;
}

export async function createProjectAction() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const newProject: ProjectInsert = {
    user_id: user.id,
    title: "Untitled Project",
    description: "",
    model_data: null,
    settings: {},
    is_public: false,
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(newProject)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Failed to create project");
  }

  return data;
}

export async function deleteProjectAction(projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    throw new Error("Failed to delete project");
  }
}
