import type { Database } from "@/supabase/types";
import type { User } from "@supabase/supabase-js";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type UserRole = Database["public"]["Enums"]["user_role"];

export type AuthUser = {
  user: User;
  profile: Profile | null;
};
