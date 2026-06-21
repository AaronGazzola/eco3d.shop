export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      dragon_alleles: {
        Row: {
          created_at: string
          dominance_rank: number
          filament_color_id: string
          frequency: number
          gene_id: string
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dominance_rank?: number
          filament_color_id: string
          frequency?: number
          gene_id: string
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dominance_rank?: number
          filament_color_id?: string
          frequency?: number
          gene_id?: string
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dragon_alleles_filament_color_id_fkey"
            columns: ["filament_color_id"]
            isOneToOne: false
            referencedRelation: "filament_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_alleles_gene_id_fkey"
            columns: ["gene_id"]
            isOneToOne: false
            referencedRelation: "dragon_genes"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_genes: {
        Row: {
          created_at: string
          display_order: number
          id: string
          key: string
          name: string
          role_id: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          key: string
          name: string
          role_id: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          key?: string
          name?: string
          role_id?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dragon_genes_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "dragon_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dragon_genes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "dragon_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_models: {
        Row: {
          created_at: string
          groups: Json
          id: string
          model_rotation: number[]
          role_tags: Json
          stage: Database["public"]["Enums"]["dragon_stage"]
          stl_key: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          groups?: Json
          id?: string
          model_rotation?: number[]
          role_tags?: Json
          stage: Database["public"]["Enums"]["dragon_stage"]
          stl_key: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          groups?: Json
          id?: string
          model_rotation?: number[]
          role_tags?: Json
          stage?: Database["public"]["Enums"]["dragon_stage"]
          stl_key?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dragon_models_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "dragon_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_roles: {
        Row: {
          created_at: string
          display_order: number
          id: string
          key: string
          name: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          key: string
          name: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          key?: string
          name?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dragon_roles_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "dragon_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      dragon_variants: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          max_print_colors: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          max_print_colors?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          max_print_colors?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dragons: {
        Row: {
          created_at: string
          genotype: Json
          id: string
          name: string | null
          stage: Database["public"]["Enums"]["dragon_stage"]
          updated_at: string
          user_id: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          genotype?: Json
          id?: string
          name?: string | null
          stage?: Database["public"]["Enums"]["dragon_stage"]
          updated_at?: string
          user_id?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          genotype?: Json
          id?: string
          name?: string | null
          stage?: Database["public"]["Enums"]["dragon_stage"]
          updated_at?: string
          user_id?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dragons_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "dragon_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      filament_colors: {
        Row: {
          available: boolean
          brand: string | null
          created_at: string
          hex: string
          id: string
          name: string
          sku: string | null
          updated_at: string
        }
        Insert: {
          available?: boolean
          brand?: string | null
          created_at?: string
          hex: string
          id?: string
          name: string
          sku?: string | null
          updated_at?: string
        }
        Update: {
          available?: boolean
          brand?: string | null
          created_at?: string
          hex?: string
          id?: string
          name?: string
          sku?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      model_configs: {
        Row: {
          created_at: string
          groups: Json
          id: string
          model_rotation: number[]
          name: string
          stl_key: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          groups?: Json
          id?: string
          model_rotation?: number[]
          name: string
          stl_key: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          groups?: Json
          id?: string
          model_rotation?: number[]
          name?: string
          stl_key?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      dragon_stage: "egg" | "baby" | "adult" | "winged"
      user_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      dragon_stage: ["egg", "baby", "adult", "winged"],
      user_role: ["user", "admin"],
    },
  },
} as const
