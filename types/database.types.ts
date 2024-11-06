export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country: string
          created_at: string | null
          id: string
          is_default: boolean | null
          postal_code: string
          recipient_name: string
          state: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          postal_code: string
          recipient_name: string
          state: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          postal_code?: string
          recipient_name?: string
          state?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string | null
          created_at: string | null
          id: string
          product_variant_id: string | null
          quantity: number
          updated_at: string | null
        }
        Insert: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          product_variant_id?: string | null
          quantity: number
          updated_at?: string | null
        }
        Update: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          product_variant_id?: string | null
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "cart"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          image_path: string
          product_variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order: number
          id?: string
          image_path: string
          product_variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          image_path?: string
          product_variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "images_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          order_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          order_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          price_at_order: number
          print_queue_id: string | null
          product_variant_id: string | null
          quantity: number
          status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price_at_order: number
          print_queue_id?: string | null
          product_variant_id?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price_at_order?: number
          print_queue_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_print_queue_id_fkey"
            columns: ["print_queue_id"]
            isOneToOne: false
            referencedRelation: "print_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country: string
          created_at: string | null
          currency: string
          expected_fulfillment_date: string | null
          id: string
          is_custom: boolean | null
          postal_code: string
          recipient_name: string | null
          state: string
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country: string
          created_at?: string | null
          currency?: string
          expected_fulfillment_date?: string | null
          id?: string
          is_custom?: boolean | null
          postal_code: string
          recipient_name?: string | null
          state: string
          status?: Database["public"]["Enums"]["order_status"]
          total_price: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          currency?: string
          expected_fulfillment_date?: string | null
          id?: string
          is_custom?: boolean | null
          postal_code?: string
          recipient_name?: string | null
          state?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_id: string | null
          payment_method: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          payment_method: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string | null
          id: string
          min_quantity: number
          price_per_item: number
          product_variant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          min_quantity: number
          price_per_item: number
          product_variant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          min_quantity?: number
          price_per_item?: number
          product_variant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      print_queue_items: {
        Row: {
          created_at: string | null
          id: string
          is_processed: boolean | null
          order_item_id: string | null
          print_queue_id: string | null
          product_variant_id: string | null
          quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_processed?: boolean | null
          order_item_id?: string | null
          print_queue_id?: string | null
          product_variant_id?: string | null
          quantity: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_processed?: boolean | null
          order_item_id?: string | null
          print_queue_id?: string | null
          product_variant_id?: string | null
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_queue_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_queue_items_print_queue_id_fkey"
            columns: ["print_queue_id"]
            isOneToOne: false
            referencedRelation: "print_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_queue_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      print_queues: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      print_time_tiers: {
        Row: {
          created_at: string | null
          id: string
          min_quantity: number
          print_time_per_item: unknown
          product_variant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          min_quantity: number
          print_time_per_item: unknown
          product_variant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          min_quantity?: number
          print_time_per_item?: unknown
          product_variant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_time_tiers_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          custom_attributes: Json | null
          estimated_print_seconds: number | null
          group_size: number | null
          id: string
          primary_image_id: string | null
          print_queue_id: string | null
          product_id: string | null
          stock_quantity: number
          updated_at: string | null
          variant_name: string
        }
        Insert: {
          created_at?: string | null
          custom_attributes?: Json | null
          estimated_print_seconds?: number | null
          group_size?: number | null
          id?: string
          primary_image_id?: string | null
          print_queue_id?: string | null
          product_id?: string | null
          stock_quantity?: number
          updated_at?: string | null
          variant_name: string
        }
        Update: {
          created_at?: string | null
          custom_attributes?: Json | null
          estimated_print_seconds?: number | null
          group_size?: number | null
          id?: string
          primary_image_id?: string | null
          print_queue_id?: string | null
          product_id?: string | null
          stock_quantity?: number
          updated_at?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_primary_image_id_fkey"
            columns: ["primary_image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_print_queue_id_fkey"
            columns: ["print_queue_id"]
            isOneToOne: false
            referencedRelation: "print_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          created_at: string | null
          expiration_date: string
          id: string
          is_redeemed: boolean | null
          is_seen: boolean | null
          percentage_discount: number
          promo_code: string
          promo_key_id: string | null
        }
        Insert: {
          created_at?: string | null
          expiration_date: string
          id?: string
          is_redeemed?: boolean | null
          is_seen?: boolean | null
          percentage_discount: number
          promo_code: string
          promo_key_id?: string | null
        }
        Update: {
          created_at?: string | null
          expiration_date?: string
          id?: string
          is_redeemed?: boolean | null
          is_seen?: boolean | null
          percentage_discount?: number
          promo_code?: string
          promo_key_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_promo_key_id_fkey"
            columns: ["promo_key_id"]
            isOneToOne: false
            referencedRelation: "promo_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_keys: {
        Row: {
          created_at: string | null
          id: string
          item_code: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_code: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_code?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          id: string
          promo_code_id: string | null
          redeemed_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          promo_code_id?: string | null
          redeemed_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          promo_code_id?: string | null
          redeemed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          refund_amount: number
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_amount: number
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_amount?: number
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: number
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      shipping_details: {
        Row: {
          created_at: string | null
          estimated_delivery: string | null
          id: string
          order_id: string | null
          shipping_provider: string
          shipping_status: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_delivery?: string | null
          id?: string
          order_id?: string | null
          shipping_provider: string
          shipping_status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_delivery?: string | null
          id?: string
          order_id?: string | null
          shipping_provider?: string
          shipping_status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authorize: {
        Args: {
          requested_permission: Database["public"]["Enums"]["app_permission"]
        }
        Returns: boolean
      }
      custom_access_token_hook: {
        Args: {
          event: Json
        }
        Returns: Json
      }
    }
    Enums: {
      app_permission:
        | "products.manage"
        | "orders.manage"
        | "users.manage"
        | "site.settings"
      app_role: "admin"
      order_status:
        | "pending"
        | "shipped"
        | "delivered"
        | "payment_received"
        | "in_production"
        | "refunded"
      payment_status: "pending" | "completed" | "failed"
      refund_status: "pending" | "approved" | "rejected" | "processed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
