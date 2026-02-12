"use server";

import { createClient } from "@/lib/supabase/server-client";

export async function getFeaturedDesignsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("published_designs")
    .select(`
      *,
      creator:profiles!published_designs_user_id_fkey(*)
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error(error);
    throw new Error("Failed to fetch featured designs");
  }

  return data;
}
