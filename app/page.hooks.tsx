"use client";

import { useQuery } from "@tanstack/react-query";
import { getFeaturedDesignsAction } from "./page.actions";

export function useFeaturedDesigns() {
  return useQuery({
    queryKey: ["featuredDesigns"],
    queryFn: () => getFeaturedDesignsAction(),
  });
}
