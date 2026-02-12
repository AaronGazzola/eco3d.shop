import type { Database } from "@/supabase/types";
import type { User } from "@supabase/supabase-js";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type PublishedDesign =
  Database["public"]["Tables"]["published_designs"]["Row"];
export type PublishedDesignInsert =
  Database["public"]["Tables"]["published_designs"]["Insert"];
export type PublishedDesignUpdate =
  Database["public"]["Tables"]["published_designs"]["Update"];

export type UserRole = Database["public"]["Enums"]["user_role"];

export type AuthUser = {
  user: User;
  profile: Profile | null;
};

export type SceneObject = {
  id: string;
  type: "cube" | "sphere" | "cylinder";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
};

export type ModelData =
  | {
      type: "scene-graph";
      objects: SceneObject[];
      metadata?: {
        objectCount: number;
        boundingBox?: {
          min: [number, number, number];
          max: [number, number, number];
        };
      };
    }
  | {
      type: "glb";
      glbBase64: string;
      metadata?: {
        vertices?: number;
        faces?: number;
        boundingBox?: {
          min: [number, number, number];
          max: [number, number, number];
        };
      };
    };
