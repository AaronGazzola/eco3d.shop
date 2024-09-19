import { Database } from "@/types/database.types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

export enum Table {
  Profiles = "profiles",
  Sessions = "sessions",
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}
