import type { PublishedDesign, Profile } from "./layout.types";

export type FeaturedDesign = PublishedDesign & {
  creator: Profile;
};
