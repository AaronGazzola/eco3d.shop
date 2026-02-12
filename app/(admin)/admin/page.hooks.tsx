"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/browser-client";

async function getAdminStatsAction() {
  const supabase = createClient();

  const { data: pendingDesigns, error: designsError } = await supabase
    .from("published_designs")
    .select("id", { count: "exact" })
    .eq("status", "pending");

  if (designsError) {
    console.error(designsError);
    throw new Error("Failed to fetch pending designs count");
  }

  return {
    pendingDesigns: pendingDesigns?.length || 0,
  };
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["adminStats"],
    queryFn: () => getAdminStatsAction(),
  });
}
