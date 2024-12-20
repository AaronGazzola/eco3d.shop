"use server";

import getActionResponse from "@/actions/getActionResponse";
import getSupabaseServerActionClient from "@/clients/action-client";
import {
  calculatePrintTimes,
  calculateQueueTimes,
  findVariantsForCart,
} from "@/lib/q.util";
import { ActionResponse } from "@/types/action.types";
import { CartItem } from "@/types/cart.types";

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
    const [queueResponse, variantsResponse] = await Promise.all([
      supabase
        .from("print_queue_items")
        .select(
          `
          id,
          quantity,
          product_variant_id,
          created_seconds,
          print_started_seconds,
          is_processed,
          print_queue_id
        `,
        )
        .eq("is_processed", false)
        .order("created_at", { ascending: true }),
      supabase.from("product_variants").select("*").in("id", variantIds),
    ]);

    if (queueResponse.error) throw queueResponse.error;
    if (variantsResponse.error) throw variantsResponse.error;

    const times = calculateQueueTimes(
      variantsResponse.data,
      queueResponse.data,
    );

    return getActionResponse({
      data: {
        qTimeMs: times.qTime * 1000,
        printTimeMs: times.printTime * 1000,
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
    return getActionResponse({ data });
  } catch (error) {
    return getActionResponse({ error });
  }
};

const transformSize = (size: string): "sm" | "md" | "lg" => {
  const sizeMap: Record<string, "sm" | "md" | "lg"> = {
    Small: "sm",
    Medium: "md",
    Large: "lg",
  };
  return sizeMap[size] || "md";
};

export const getCartTimeAction = async (
  items: CartItem[],
): Promise<ActionResponse<{ printTime: number; qTime: number }>> => {
  try {
    const supabase = await getSupabaseServerActionClient();

    console.log("Finding variants for cart items:", items);
    const variants = await findVariantsForCart(supabase, items);

    if (!variants.length) {
      console.log("No variants found for cart items");
      return getActionResponse({ data: { printTime: 0, qTime: 0 } });
    }

    console.log(
      "Found variants:",
      variants.map((v) => v.id),
    );
    const times = await calculatePrintTimes(supabase, variants);

    return getActionResponse({
      data: {
        printTime: times.printTime,
        qTime: times.qTime,
      },
    });
  } catch (error) {
    console.error("Error in getCartTimeAction:", error);
    return getActionResponse({ error });
  }
};
