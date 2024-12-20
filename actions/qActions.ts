"use server";

import getActionResponse from "@/actions/getActionResponse";
import getSupabaseServerActionClient from "@/clients/action-client";

export interface UpdateStatusParams {
  itemId: string;
  status: "waiting" | "printing" | "complete";
}

export const updatePrintQueueItemStatusAction = async ({
  itemId,
  status,
}: UpdateStatusParams) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const updates = {
      is_processed: status === "complete",
      print_started_seconds:
        status === "printing"
          ? Math.floor(Date.now() / 1000)
          : status === "waiting"
            ? null
            : undefined,
    };

    const { data, error } = await supabase
      .from("print_queue_items")
      .update(updates)
      .eq("id", itemId)
      .select(
        `
        *,
        product_variants!inner (
          estimated_print_seconds,
          variant_name
        )
      `,
      )
      .single();

    if (error) throw error;
    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getQueueTimeAction = async (variantIds: string[]) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data: queueItems, error: queueError } = await supabase
      .from("print_queue_items")
      .select(
        `
        quantity,
        product_variant_id,
        product_variants (
          estimated_print_seconds
        )
        `,
      )
      .in("product_variant_id", variantIds)
      .eq("is_processed", false)
      .order("created_at", { ascending: true });

    if (queueError) throw queueError;

    let maxWaitTime = 0;
    queueItems?.forEach((item) => {
      const printTime = item.product_variants?.estimated_print_seconds || 0;
      const batchTime = printTime * item.quantity;
      maxWaitTime = Math.max(maxWaitTime, batchTime);
    });

    return getActionResponse({
      data: {
        queueTimeMs: maxWaitTime * 1000,
        printTimeMs: maxWaitTime * 1000,
      },
    });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getQueueItemsAction = async (queueId: string) => {
  try {
    const supabase = await getSupabaseServerActionClient();
    const { data, error } = await supabase
      .from("print_queue_items")
      .select(
        `
        id,
        print_queue_id,
        updated_at,
        is_processed,
        print_started_seconds,
        quantity,
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
      .eq("print_queue_id", queueId)
      .order("updated_at", { ascending: true });

    if (error) throw error;
    console.log(data);
    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};
