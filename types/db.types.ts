import { Tables } from "@/types/database.types";
import { User } from "@supabase/supabase-js";
import { ColumnDef } from "@tanstack/react-table";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface HookOptions<T> {
  errorMessage?: string;
  successMessage?: string;
  initialData?: T | null;
}
