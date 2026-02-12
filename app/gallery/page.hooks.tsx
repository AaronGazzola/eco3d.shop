"use client";

import { useQuery } from "@tanstack/react-query";
import { getFeaturedDesignsAction } from "@/app/page.actions";

export function usePublishedDesigns() {
  return useQuery({
    queryKey: ["publishedDesigns"],
    queryFn: () => getFeaturedDesignsAction(),
  });
}
