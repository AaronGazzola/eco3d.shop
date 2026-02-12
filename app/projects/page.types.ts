import type { Project, PublishedDesign } from "@/app/layout.types";

export type ProjectWithStatus = Project & {
  published?: PublishedDesign | null;
};
