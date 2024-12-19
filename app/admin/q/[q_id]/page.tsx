"use server";
import PrintQPage from "@/app/admin/q/[q_id]/PrintQPage";
import getSupabaseServerComponentClient from "@/clients/server-component-client";
import { notFound } from "next/navigation";

type JoinedItem = {
  id: string;
  order_item_id: string | null;
  quantity: number;
  is_processed: boolean | null;
  created_at: string | null;
  order_items: {
    order: {
      id: string;
      created_at: string | null;
      profile: {
        email: string;
      };
    } | null;
  } | null;
  product_variant: {
    estimated_print_seconds: number | null;
    variant_name: string;
  } | null;
};

export default async function Page({ params }: { params: { q_id: string } }) {
  const supabase = getSupabaseServerComponentClient();

  const { data: items, error } = await supabase
    .from("print_queue_items")
    .select(
      `
    *,
    product_variants!inner (
      estimated_print_seconds,
      variant_name
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
    .order("created_at", { ascending: false })
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
    created_at: item.created_at,
    order_items: item.order_items,
    product_variant: item.product_variant,
  }));

  return <PrintQPage items={formattedItems} queueId={params.q_id} />;
}
