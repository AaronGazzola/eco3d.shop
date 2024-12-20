import { CartItem } from "@/types/cart.types";
import { Database } from "@/types/database.types";
import { SupabaseClient } from "@supabase/supabase-js";

export interface QueueItem {
  id?: string;
  quantity: number;
  product_variant_id: string | null;
  created_seconds: number;
  print_started_seconds?: number | null;
  is_processed: boolean | null;
  print_queue_id: string | null;
  order_item_id?: string | null;
  updated_at?: string | null;
  product_variants: {
    estimated_print_seconds: number | null;
  } | null;
}

export interface QueueTime {
  printTime: number;
  qTime: number;
}

const transformSize = (size: string): "sm" | "md" | "lg" => {
  const sizeMap: Record<string, "sm" | "md" | "lg"> = {
    Small: "sm",
    Medium: "md",
    Large: "lg",
  };
  return sizeMap[size] || "md";
};

type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];

export const findVariantsForCart = async (
  supabase: SupabaseClient<Database>,
  items: CartItem[],
  productName = "Model V8",
): Promise<{ variant: ProductVariant; quantity: number }[]> => {
  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      product_variants (*)
    `,
    )
    .eq("name", productName)
    .single();

  if (error || !products?.product_variants) {
    return [];
  }

  return items
    .map((item) => {
      const matchingVariant = products.product_variants.find((variant) => {
        const attrs = variant.attributes as { size: string; color: string[] };
        return (
          attrs.size === transformSize(item.size) &&
          JSON.stringify(attrs.color?.sort()) ===
            JSON.stringify(item.colors?.map((c) => c.toLowerCase())?.sort())
        );
      });

      return matchingVariant
        ? { variant: matchingVariant, quantity: item.quantity }
        : null;
    })
    .filter(
      (v): v is { variant: ProductVariant; quantity: number } => v !== null,
    );
};

export const calculateQueueTimes = (
  variants: {
    id: string;
    print_queue_id: string | null;
    estimated_print_seconds: number | null;
    variant_name: string;
  }[],
  queueItems: QueueItem[],
): QueueTime => {
  const queueTimes = new Map<string, number>();

  variants.forEach((variant) => {
    if (!variant.print_queue_id || !variant.estimated_print_seconds) {
      return;
    }

    const queueItemsForQueue = queueItems.filter(
      (qi) => qi.print_queue_id === variant.print_queue_id && !qi.is_processed,
    );

    const currentQueueTime = queueItemsForQueue.reduce((total, qi) => {
      if (
        !qi.product_variant_id ||
        !qi.product_variants?.estimated_print_seconds
      )
        return total;
      const itemTime =
        qi.product_variants.estimated_print_seconds * qi.quantity;
      return total + itemTime;
    }, 0);

    queueTimes.set(variant.print_queue_id, currentQueueTime);
  });

  const qTime = Math.min(...Array.from(queueTimes.values(), (v) => v || 0));
  const printTime = Math.max(
    ...variants.map((v) => v.estimated_print_seconds ?? 0),
  );

  return { printTime, qTime };
};

export const calculatePrintTimes = async (
  supabase: SupabaseClient<Database>,
  variantsWithQuantity: { variant: ProductVariant; quantity: number }[],
) => {
  const allQueueIds = await getAllQueueIds(supabase);

  if (!allQueueIds.length) {
    return { printTime: 0, qTime: 0 };
  }

  const { data: queueItems, error } = await supabase
    .from("print_queue_items")
    .select(
      `
      *,
      product_variants (
        estimated_print_seconds
      )
    `,
    )
    .in("print_queue_id", allQueueIds)
    .eq("is_processed", false);

  if (error || !queueItems) {
    return { printTime: 0, qTime: 0 };
  }

  const variants = variantsWithQuantity.map((vq) => ({
    id: vq.variant.id,
    print_queue_id: vq.variant.print_queue_id,
    estimated_print_seconds: vq.variant.estimated_print_seconds
      ? vq.variant.estimated_print_seconds * vq.quantity
      : null,
    variant_name: vq.variant.variant_name,
  }));

  return calculateQueueTimes(variants, queueItems);
};

const getAllQueueIds = async (
  supabase: SupabaseClient<Database>,
): Promise<string[]> => {
  const { data: queues } = await supabase.from("print_queues").select("id");
  return queues?.map((q) => q.id) ?? [];
};
