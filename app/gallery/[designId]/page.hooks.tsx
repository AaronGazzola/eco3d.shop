"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublishedDesignAction } from "./page.actions";

export function usePublishedDesign(designId: string) {
  return useQuery({
    queryKey: ["publishedDesign", designId],
    queryFn: () => getPublishedDesignAction(designId),
  });
}
