// actions/qActions.ts
"use server";

import getActionResponse from "@/actions/getActionResponse";
import getSupabaseServerActionClient from "@/clients/action-client";
import { ActionResponse } from "@/types/action.types";

interface QueueTimeResponse {
  queueTimeMs: number;
  printTimeMs: number;
}

export const getQueueTimeAction = async (
  variantIds: string[],
): Promise<ActionResponse<QueueTimeResponse>> => {
  try {
    const supabase = await getSupabaseServerActionClient();

    const { data: queueItems, error: queueError } = await supabase
      .from("print_queue_items")
      .select(
        `
        quantity,
        product_variant_id,
        product_variants (
          estimated_print_seconds,
          group_size
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
      const groupSize = item.product_variants?.group_size || 1;
      const batchTime = (printTime * item.quantity) / groupSize;
      maxWaitTime = Math.max(maxWaitTime, batchTime);
    });

    return getActionResponse<QueueTimeResponse>({
      data: {
        queueTimeMs: maxWaitTime * 1000,
        printTimeMs: maxWaitTime * 1000,
      },
    });
  } catch (error) {
    return getActionResponse<QueueTimeResponse>({ error });
  }
};
