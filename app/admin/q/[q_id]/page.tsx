"use server";
import PrintQPage from "@/app/admin/q/[q_id]/PrintQPage";
import getSupabaseServerComponentClient from "@/clients/server-component-client";
import { Json } from "@/types/database.types";
import { notFound } from "next/navigation";

type JoinedItem = {
  id: string;
  order_item_id: string | null;
  quantity: number;
  is_processed: boolean | null;
  updated_at: string | null;
  print_started_seconds: number | null;
  product_variant: {
    id: string;
    estimated_print_seconds: number | null;
    variant_name: string;
    attributes: Json;
  };
  order_items: {
    order: {
      id: string;
      created_at: string | null;
      profile: {
        email: string;
      };
    } | null;
  } | null;
};

export default async function Page({ params }: { params: { q_id: string } }) {
  const supabase = getSupabaseServerComponentClient();

  const { data: items, error } = await supabase
    .from("print_queue_items")
    .select(
      `
  *,
  product_variant:product_variants!inner ( 
    id,
    estimated_print_seconds,
    variant_name,
    attributes
  ),
  order_items (
    order:orders (
      id,
      created_at,
      profile:profiles (
        email
      )
    )
  )
`,
    )
    .eq("print_queue_id", params.q_id)
    .order("updated_at", { ascending: false })
    .returns<JoinedItem[]>();

  if (error || !items) {
    console.error("Print Queue Items Error:", error);
    notFound();
  }

  const formattedItems = items.map((item) => ({
    id: item.id,
    order_item_id: item.order_item_id,
    quantity: item.quantity,
    is_processed: item.is_processed,
    updated_at: item.updated_at,
    print_started_seconds: item.print_started_seconds, // Include this field
    order_items: item.order_items,
    product_variant: item.product_variant,
  }));

  return <PrintQPage items={formattedItems} queueId={params.q_id} />;
}
