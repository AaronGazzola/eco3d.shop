"use server";

import { createClient } from "@/lib/supabase/server-client";
import type { ProjectUpdate, PublishedDesignInsert } from "@/app/layout.types";

export async function getProjectAction(projectId: string) {
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
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error(error);
    throw new Error("Failed to fetch project");
  }

  return data;
}

export async function saveProjectAction(projectId: string, updates: ProjectUpdate) {
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
    .update(updates)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Failed to save project");
  }

  return data;
}

export async function submitDesignAction(
  projectId: string,
  title: string,
  description: string
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    console.error(projectError);
    throw new Error("Project not found");
  }

  if (!project.model_data) {
    throw new Error("Cannot submit project without 3D model");
  }

  const newDesign: PublishedDesignInsert = {
    user_id: user.id,
    project_id: projectId,
    title,
    description,
    preview_url: "",
    model_data: project.model_data,
    configuration: project.settings || {},
    status: "pending",
  };

  const { data, error } = await supabase
    .from("published_designs")
    .insert(newDesign)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Failed to submit design");
  }

  return data;
}
