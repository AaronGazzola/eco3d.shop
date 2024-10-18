import { Tables } from "@/types/database.types";
import { User } from "@supabase/supabase-js";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface initialQueryCache {
  user?: User | null;
  profile?: Tables<"profiles"> | null;
}
