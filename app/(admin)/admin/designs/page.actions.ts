"use server";

import { createClient } from "@/lib/supabase/server-client";

export async function getPendingDesignsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("published_designs")
    .select(`
      *,
      creator:profiles!published_designs_user_id_fkey(*)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    throw new Error("Failed to fetch pending designs");
  }

  return data;
}

export async function approveDesignAction(designId: string, feedback?: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { error: updateError } = await supabase
    .from("published_designs")
    .update({ status: "published" })
    .eq("id", designId);

  if (updateError) {
    console.error(updateError);
    throw new Error("Failed to approve design");
  }

  const { error: reviewError } = await supabase
    .from("design_reviews")
    .insert({
      design_id: designId,
      reviewer_id: user.id,
      status: "approved",
      feedback: feedback || null,
    });

  if (reviewError) {
    console.error(reviewError);
  }
}

export async function rejectDesignAction(designId: string, feedback: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { error: updateError } = await supabase
    .from("published_designs")
    .update({ status: "rejected" })
    .eq("id", designId);

  if (updateError) {
    console.error(updateError);
    throw new Error("Failed to reject design");
  }

  const { error: reviewError } = await supabase
    .from("design_reviews")
    .insert({
      design_id: designId,
      reviewer_id: user.id,
      status: "rejected",
      feedback,
    });

  if (reviewError) {
    console.error(reviewError);
  }
}
