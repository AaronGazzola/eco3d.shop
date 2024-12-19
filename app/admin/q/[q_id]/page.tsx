"use server";
import PrintQPage from "@/app/admin/q/[q_id]/PrintQPage";
import getSupabaseServerComponentClient from "@/clients/server-component-client";
import { Tables } from "@/types/database.types";
import { notFound } from "next/navigation";

type JoinedItem = Tables<"print_queue_items"> & {
  order_items: Tables<"order_items"> & {
    orders: Tables<"orders"> & {
      profiles: Tables<"profiles">;
    };
  };
};

export default async function Page({ params }: { params: { q_id: string } }) {
  const supabase = getSupabaseServerComponentClient();
  const { data: items, error } = await supabase
    .from("print_queue_items")
    .select(
      `
     *,
     order_items (
       *,
       orders (
         *,
         profiles (*)
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
    order_item_id: item.order_items?.id || "",
    quantity: item.quantity,
    is_processed: item.is_processed || false,
    created_at: item.created_at || "",
    order: {
      id: item.order_items?.orders?.id || "",
      user: {
        email: item.order_items?.orders?.profiles?.email || "",
      },
      created_at: item.order_items?.orders?.created_at || "",
    },
    related_items: [],
  }));

  return <PrintQPage items={formattedItems} queueId={params.q_id} />;
}
