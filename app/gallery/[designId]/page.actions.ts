"use server";

import { createClient } from "@/lib/supabase/server-client";

export async function getPublishedDesignAction(designId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("published_designs")
    .select(`
      *,
      creator:profiles!published_designs_user_id_fkey(*)
    `)
    .eq("id", designId)
    .eq("status", "published")
    .single();

  if (error) {
    console.error(error);
    throw new Error("Failed to fetch design");
  }

  return data;
}
